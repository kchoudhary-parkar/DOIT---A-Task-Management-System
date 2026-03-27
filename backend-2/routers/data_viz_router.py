from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Query
from fastapi.responses import Response, StreamingResponse
from typing import Optional
import json
import io

from controllers.data_viz_controller import (
    DataVizController,
    handle_upload,
    handle_get_datasets,
    handle_analyze,
    handle_visualize,
    handle_download,
    handle_get_visualizations,
)
from middleware.agent_auth import verify_agent_token_optional
from models.user import User

router = APIRouter()


def _resolve_effective_user_id(
    requesting_user: Optional[str],
    agent_user_id: Optional[str],
) -> str:
    """Resolve effective user for data-viz routes from requesting_user or auth context."""
    email = (requesting_user or "").strip().lower()
    if email:
        user = User.find_by_email(email)
        if not user:
            raise HTTPException(
                status_code=404,
                detail=f"Requesting user '{requesting_user}' not found",
            )
        return str(user["_id"])

    if agent_user_id:
        return agent_user_id

    raise HTTPException(
        status_code=401,
        detail=(
            "Authentication or requesting_user is required. "
            "Provide API key/Bearer token or pass requesting_user query parameter."
        ),
    )


def handle_controller_response(response):
    """Helper to handle controller response format"""
    status_code = response.get("status", 500)
    body = response.get("body", "{}")

    # Parse body if it's a string
    if isinstance(body, str):
        try:
            body_data = json.loads(body)
        except:
            body_data = {"error": body}
    else:
        body_data = body

    # Raise HTTPException if error
    if status_code >= 400:
        error_msg = body_data.get("error", "Unknown error")
        raise HTTPException(status_code=status_code, detail=error_msg)

    return body_data


@router.post("/upload")
async def upload_dataset(
    request: Request,
    file: UploadFile = File(...),
    requesting_user: Optional[str] = Query(default=None),
    agent_user_id: Optional[str] = Depends(verify_agent_token_optional),
):
    """
    Upload CSV/Excel file for data visualization

    - **file**: CSV, XLSX, or XLS file
    - Returns dataset metadata with preview
    """
    try:
        # Read file content
        file_content = await file.read()

        # Validate file type
        valid_extensions = [".csv", ".xlsx", ".xls"]
        if not any(file.filename.lower().endswith(ext) for ext in valid_extensions):
            raise HTTPException(
                status_code=400,
                detail="Unsupported file format. Please upload CSV or Excel files.",
            )

        user_id = _resolve_effective_user_id(requesting_user, agent_user_id)

        # Call controller's upload_file method directly
        result = DataVizController.upload_file(
            file_data=file_content, filename=file.filename, user_id=user_id
        )

        if result.get("error"):
            raise HTTPException(status_code=400, detail=result["error"])

        return result

    except HTTPException:
        raise
    except Exception as e:
        print(f"Upload error: {e}")
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.get("/datasets")
async def get_datasets(
    requesting_user: Optional[str] = Query(default=None),
    agent_user_id: Optional[str] = Depends(verify_agent_token_optional),
):
    """
    Get all datasets uploaded by the current user

    Returns list of datasets with metadata
    """
    user_id = _resolve_effective_user_id(requesting_user, agent_user_id)
    result = DataVizController.get_datasets(user_id)

    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])

    return result


@router.post("/analyze")
async def analyze_dataset(
    request: Request,
    requesting_user: Optional[str] = Query(default=None),
    agent_user_id: Optional[str] = Depends(verify_agent_token_optional),
):
    """
    Analyze a dataset to get statistical insights

    - **dataset_id**: ID of the dataset to analyze
    - Returns statistical analysis, column types, correlations, etc.
    """
    try:
        body = await request.json()
        dataset_id = body.get("dataset_id")

        if not dataset_id:
            raise HTTPException(status_code=400, detail="dataset_id required")

        user_id = _resolve_effective_user_id(requesting_user, agent_user_id)

        # Verify dataset belongs to user
        from bson import ObjectId
        from database import datasets as datasets_collection

        dataset = datasets_collection.find_one({"_id": ObjectId(dataset_id)})
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")
        if dataset.get("user_id") != user_id:
            raise HTTPException(
                status_code=403, detail="Unauthorized access to dataset"
            )

        result = DataVizController.analyze_data(dataset_id)

        if result.get("error"):
            raise HTTPException(status_code=400, detail=result["error"])

        return result

    except HTTPException:
        raise
    except Exception as e:
        print(f"Analyze error: {e}")
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/visualize")
async def create_visualization(
    request: Request,
    requesting_user: Optional[str] = Query(default=None),
    agent_user_id: Optional[str] = Depends(verify_agent_token_optional),
):
    """
    Generate a visualization from a dataset

    - **dataset_id**: ID of the dataset
    - **config**: Visualization configuration
        - chart_type: scatter, line, bar, histogram, box, violin, heatmap, pie
        - library: plotly, seaborn, matplotlib
        - x_column: Column for X-axis
        - y_column: Column for Y-axis (optional for some charts)
        - color_column: Column for color grouping (optional)
        - title: Chart title
    """
    try:
        body = await request.json()
        dataset_id = body.get("dataset_id")
        viz_config = body.get("config", {})

        if not dataset_id:
            raise HTTPException(status_code=400, detail="dataset_id required")

        user_id = _resolve_effective_user_id(requesting_user, agent_user_id)

        # Verify dataset belongs to user
        from bson import ObjectId
        from database import datasets as datasets_collection

        dataset = datasets_collection.find_one({"_id": ObjectId(dataset_id)})
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")
        if dataset.get("user_id") != user_id:
            raise HTTPException(
                status_code=403, detail="Unauthorized access to dataset"
            )

        result = DataVizController.generate_visualization(
            dataset_id=dataset_id, viz_config=viz_config, user_id=user_id
        )

        if result.get("error"):
            raise HTTPException(status_code=400, detail=result["error"])

        return result

    except HTTPException:
        raise
    except Exception as e:
        print(f"Visualize error: {e}")
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/visualizations")
async def get_visualizations(
    requesting_user: Optional[str] = Query(default=None),
    agent_user_id: Optional[str] = Depends(verify_agent_token_optional),
):
    """
    Get all visualizations created by the current user

    Returns list of visualizations with metadata (sorted by newest first)
    """
    user_id = _resolve_effective_user_id(requesting_user, agent_user_id)
    result = DataVizController.get_user_visualizations(user_id)

    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])

    return result


@router.get("/download/{viz_id}")
async def download_visualization(
    viz_id: str, format: str = Query(default="png", pattern="^(png|html)$")
):
    """
    Download or view a visualization

    - **viz_id**: ID of the visualization
    - **format**: png or html
    - HTML visualizations are served inline for iframe rendering
    - PNG visualizations are downloaded as attachments
    """
    try:
        content, content_type, error = DataVizController.get_visualization(viz_id)

        if error:
            raise HTTPException(status_code=404, detail=error)

        if not content:
            raise HTTPException(status_code=404, detail="Visualization not found")

        # Determine if content should be inline or attachment
        inline = content_type == "text/html"

        filename = f"viz_{viz_id}.{format}"

        # Create response headers
        headers = {}
        if not inline:
            headers["Content-Disposition"] = f'attachment; filename="{filename}"'

        # Return response
        return Response(content=content, media_type=content_type, headers=headers)

    except HTTPException:
        raise
    except Exception as e:
        print(f"Download error: {e}")
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/datasets/{dataset_id}")
async def delete_dataset(
    dataset_id: str,
    requesting_user: Optional[str] = Query(default=None),
    agent_user_id: Optional[str] = Depends(verify_agent_token_optional),
):
    """
    Delete a dataset and all associated visualizations

    - **dataset_id**: ID of the dataset to delete
    """
    try:
        from bson import ObjectId
        from database import datasets, dataset_files, visualizations

        user_id = _resolve_effective_user_id(requesting_user, agent_user_id)

        # Verify dataset exists and belongs to user
        dataset = datasets.find_one({"_id": ObjectId(dataset_id)})
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")
        if dataset.get("user_id") != user_id:
            raise HTTPException(
                status_code=403, detail="Unauthorized access to dataset"
            )

        # Delete dataset
        datasets.delete_one({"_id": ObjectId(dataset_id)})

        # Delete associated file chunks (if chunked storage)
        dataset_files.delete_many({"dataset_id": dataset_id})

        # Delete associated visualizations
        visualizations.delete_many({"dataset_id": dataset_id})

        return {
            "success": True,
            "message": "Dataset and associated visualizations deleted successfully",
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Delete dataset error: {e}")
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/visualizations/{viz_id}")
async def delete_visualization(
    viz_id: str,
    requesting_user: Optional[str] = Query(default=None),
    agent_user_id: Optional[str] = Depends(verify_agent_token_optional),
):
    """
    Delete a specific visualization

    - **viz_id**: ID of the visualization to delete
    """
    try:
        from bson import ObjectId
        from database import visualizations

        user_id = _resolve_effective_user_id(requesting_user, agent_user_id)

        # Verify visualization exists and belongs to user
        viz = visualizations.find_one({"_id": ObjectId(viz_id)})
        if not viz:
            raise HTTPException(status_code=404, detail="Visualization not found")
        if viz.get("user_id") != user_id:
            raise HTTPException(
                status_code=403, detail="Unauthorized access to visualization"
            )

        # Delete visualization
        visualizations.delete_one({"_id": ObjectId(viz_id)})

        return {"success": True, "message": "Visualization deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Delete visualization error: {e}")
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dataset/{dataset_id}/info")
async def get_dataset_info(
    dataset_id: str,
    requesting_user: Optional[str] = Query(default=None),
    agent_user_id: Optional[str] = Depends(verify_agent_token_optional),
):
    """
    Get detailed information about a specific dataset

    - **dataset_id**: ID of the dataset
    - Returns full metadata including column details
    """
    try:
        from bson import ObjectId
        from database import datasets

        user_id = _resolve_effective_user_id(requesting_user, agent_user_id)

        dataset = datasets.find_one({"_id": ObjectId(dataset_id)})
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")
        if dataset.get("user_id") != user_id:
            raise HTTPException(
                status_code=403, detail="Unauthorized access to dataset"
            )

        # Convert ObjectId to string for JSON serialization
        dataset["_id"] = str(dataset["_id"])
        dataset["dataset_id"] = dataset["_id"]

        # Convert datetime to ISO format
        if "uploaded_at" in dataset:
            dataset["uploaded_at"] = dataset["uploaded_at"].isoformat()

        # Remove large data field if present
        if "data" in dataset:
            del dataset["data"]

        return {"success": True, "dataset": dataset}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Get dataset info error: {e}")
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
