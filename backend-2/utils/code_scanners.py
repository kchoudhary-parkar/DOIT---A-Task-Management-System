"""
Security Scanners for Code Review
Integrates Bandit, Semgrep, and custom pattern matching
"""
import os
import re
import json
import subprocess
import tempfile
from typing import List, Dict, Any, Tuple
from pathlib import Path
from models.code_review import SecurityFinding


class SecurityScanner:
    """Orchestrates multiple security scanning tools"""
    
    def __init__(self):
        self.bandit_available = self._check_bandit()
        self.semgrep_available = self._check_semgrep()
    
    def _check_bandit(self) -> bool:
        """Check if Bandit is installed"""
        try:
            subprocess.run(["bandit", "--version"], capture_output=True, check=True)
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            return False
    
    def _check_semgrep(self) -> bool:
        """Check if Semgrep is installed"""
        try:
            subprocess.run(["semgrep", "--version"], capture_output=True, check=True)
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            return False
    
    async def scan_pr_changes(self, changed_files: List[Dict[str, Any]]) -> List[SecurityFinding]:
        """
        Scan all changed files for security issues
        
        Args:
            changed_files: List of dicts with 'filename', 'patch', 'additions', 'deletions'
        
        Returns:
            List of SecurityFinding objects
        """
        findings = []
        
        # Create temporary directory for file analysis
        with tempfile.TemporaryDirectory() as temp_dir:
            # Write files to temp directory
            file_paths = []
            for file_info in changed_files:
                file_path = Path(temp_dir) / file_info['filename']
                file_path.parent.mkdir(parents=True, exist_ok=True)
                
                # Extract actual file content from patch
                content = self._extract_file_content(file_info.get('patch', ''))
                if content:
                    file_path.write_text(content, encoding='utf-8')
                    file_paths.append((str(file_path), file_info['filename']))
            
            # Run security scans
            if self.bandit_available:
                bandit_findings = await self._run_bandit(temp_dir, file_paths)
                findings.extend(bandit_findings)
            
            if self.semgrep_available:
                semgrep_findings = await self._run_semgrep(temp_dir, file_paths)
                findings.extend(semgrep_findings)
            
            # Always run pattern-based scanning
            pattern_findings = await self._run_pattern_scan(file_paths)
            findings.extend(pattern_findings)
        
        return findings
    
    def _extract_file_content(self, patch: str) -> str:
        """Extract file content from git diff patch"""
        if not patch:
            return ""
        
        lines = []
        for line in patch.split('\n'):
            # Skip diff metadata
            if line.startswith('@@') or line.startswith('diff'):
                continue
            # Keep added or unchanged lines
            if not line.startswith('-'):
                # Remove the '+' prefix from added lines
                clean_line = line[1:] if line.startswith('+') else line
                lines.append(clean_line)
        
        return '\n'.join(lines)
    
    async def _run_bandit(self, temp_dir: str, file_paths: List[Tuple[str, str]]) -> List[SecurityFinding]:
        """Run Bandit security scanner"""
        findings = []
        
        try:
            # Run Bandit with JSON output
            result = subprocess.run(
                ["bandit", "-r", temp_dir, "-f", "json", "-ll"],
                capture_output=True,
                text=True,
                timeout=60
            )
            
            if result.stdout:
                bandit_data = json.loads(result.stdout)
                
                for issue in bandit_data.get('results', []):
                    # Map temp path back to original filename
                    temp_path = issue['filename']
                    original_filename = self._map_temp_to_original(temp_path, temp_dir, file_paths)
                    
                    finding = SecurityFinding(
                        severity=issue['issue_severity'].lower(),
                        type=issue['test_id'],
                        message=issue['issue_text'],
                        file_path=original_filename,
                        line_number=issue['line_number'],
                        code_snippet=issue['code'],
                        recommendation=issue.get('more_info', 'Review and remediate'),
                        scanner="bandit"
                    )
                    findings.append(finding)
        
        except Exception as e:
            print(f"[BANDIT ERROR] {str(e)}")
        
        return findings
    
    async def _run_semgrep(self, temp_dir: str, file_paths: List[Tuple[str, str]]) -> List[SecurityFinding]:
        """Run Semgrep security scanner"""
        findings = []
        
        try:
            # Run Semgrep with auto configuration
            result = subprocess.run(
                ["semgrep", "--config=auto", "--json", temp_dir],
                capture_output=True,
                text=True,
                timeout=120
            )
            
            if result.stdout:
                semgrep_data = json.loads(result.stdout)
                
                for issue in semgrep_data.get('results', []):
                    temp_path = issue['path']
                    original_filename = self._map_temp_to_original(temp_path, temp_dir, file_paths)
                    
                    finding = SecurityFinding(
                        severity=self._map_semgrep_severity(issue.get('extra', {}).get('severity', 'INFO')),
                        type=issue['check_id'],
                        message=issue['extra']['message'],
                        file_path=original_filename,
                        line_number=issue['start']['line'],
                        code_snippet=issue['extra'].get('lines', ''),
                        recommendation=issue['extra'].get('fix', 'Review and remediate'),
                        scanner="semgrep"
                    )
                    findings.append(finding)
        
        except Exception as e:
            print(f"[SEMGREP ERROR] {str(e)}")
        
        return findings
    
    async def _run_pattern_scan(self, file_paths: List[Tuple[str, str]]) -> List[SecurityFinding]:
        """Run custom pattern-based security scanning"""
        findings = []
        
        # Security patterns to detect
        patterns = {
            'hardcoded_secret': {
                'regex': r'(password|secret|api_key|token)\s*=\s*["\'][^"\']+["\']',
                'severity': 'critical',
                'type': 'Hardcoded Secret',
                'message': 'Potential hardcoded secret or credential detected',
                'recommendation': 'Use environment variables or secure vault for secrets'
            },
            'sql_injection': {
                'regex': r'(execute|query|executemany)\s*\(\s*["\'].*%s.*["\']',
                'severity': 'high',
                'type': 'SQL Injection Risk',
                'message': 'Potential SQL injection vulnerability',
                'recommendation': 'Use parameterized queries or ORM'
            },
            'command_injection': {
                'regex': r'(os\.system|subprocess\.call|eval)\s*\(',
                'severity': 'high',
                'type': 'Command Injection Risk',
                'message': 'Potential command injection vulnerability',
                'recommendation': 'Validate and sanitize all inputs, use safe alternatives'
            },
            'todo_fixme': {
                'regex': r'(TODO|FIXME|HACK|XXX)[\s:]+(.+)',
                'severity': 'info',
                'type': 'TODO/FIXME Comment',
                'message': 'Code contains TODO or FIXME comment',
                'recommendation': 'Address technical debt before merging'
            }
        }
        
        for file_path, original_name in file_paths:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    lines = content.split('\n')
                
                for pattern_name, pattern_config in patterns.items():
                    matches = re.finditer(pattern_config['regex'], content, re.IGNORECASE)
                    
                    for match in matches:
                        # Find line number
                        line_num = content[:match.start()].count('\n') + 1
                        
                        finding = SecurityFinding(
                            severity=pattern_config['severity'],
                            type=pattern_config['type'],
                            message=pattern_config['message'],
                            file_path=original_name,
                            line_number=line_num,
                            code_snippet=lines[line_num - 1] if line_num <= len(lines) else match.group(0),
                            recommendation=pattern_config['recommendation'],
                            scanner="pattern-match"
                        )
                        findings.append(finding)
            
            except Exception as e:
                print(f"[PATTERN SCAN ERROR] {file_path}: {str(e)}")
        
        return findings
    
    def _map_temp_to_original(self, temp_path: str, temp_dir: str, file_paths: List[Tuple[str, str]]) -> str:
        """Map temporary file path back to original filename"""
        rel_path = os.path.relpath(temp_path, temp_dir)
        
        for temp, original in file_paths:
            if rel_path in temp:
                return original
        
        return rel_path
    
    def _map_semgrep_severity(self, semgrep_severity: str) -> str:
        """Map Semgrep severity to our standard levels"""
        mapping = {
            'ERROR': 'high',
            'WARNING': 'medium',
            'INFO': 'info'
        }
        return mapping.get(semgrep_severity.upper(), 'info')


class CodeQualityAnalyzer:
    """Analyzes code quality metrics"""
    
    async def analyze_code_quality(self, changed_files: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyze code quality metrics
        
        Returns:
            Dict with quality scores and issues
        """
        metrics = {
            'complexity_score': 0.0,
            'documentation_score': 0.0,
            'test_coverage_indicator': 0.0,
            'maintainability_score': 0.0,
            'issues': [],
            'recommendations': []
        }
        
        total_files = len(changed_files)
        if total_files == 0:
            return metrics
        
        complexity_issues = []
        doc_issues = []
        test_indicators = []
        
        for file_info in changed_files:
            filename = file_info['filename']
            patch = file_info.get('patch', '')
            
            # Check file size (large files indicate complexity)
            additions = file_info.get('additions', 0)
            if additions > 500:
                complexity_issues.append(f"{filename}: Large file changes ({additions} lines)")
            
            # Check for documentation
            if not self._has_documentation(patch):
                doc_issues.append(f"{filename}: Missing documentation")
            
            # Check for test files
            if 'test' in filename.lower() or '_test' in filename.lower():
                test_indicators.append(filename)
        
        # Calculate scores (0-10)
        metrics['complexity_score'] = max(0, 10 - len(complexity_issues) * 2)
        metrics['documentation_score'] = max(0, 10 - len(doc_issues) * 1.5)
        metrics['test_coverage_indicator'] = min(10, len(test_indicators) * 2)
        metrics['maintainability_score'] = (
            metrics['complexity_score'] + 
            metrics['documentation_score'] + 
            metrics['test_coverage_indicator']
        ) / 3
        
        metrics['issues'] = complexity_issues + doc_issues
        
        if metrics['maintainability_score'] < 7:
            metrics['recommendations'].append('Consider breaking down complex changes')
        if metrics['documentation_score'] < 5:
            metrics['recommendations'].append('Add comprehensive documentation')
        if metrics['test_coverage_indicator'] < 5:
            metrics['recommendations'].append('Include unit tests for new functionality')
        
        return metrics
    
    def _has_documentation(self, patch: str) -> bool:
        """Check if patch contains documentation"""
        doc_patterns = [
            r'"""',  # Python docstrings
            r'/\*\*',  # JSDoc
            r'@param',  # Parameter documentation
            r'@returns',  # Return documentation
            r'#\s*TODO',  # At least TODO comments
        ]
        
        for pattern in doc_patterns:
            if re.search(pattern, patch):
                return True
        
        return False
