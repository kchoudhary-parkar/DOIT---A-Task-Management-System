#!/usr/bin/env python3
"""
Voice Chat Backend Test Script
Tests Azure Whisper + TTS integration

Usage:
    python test_voice_chat.py --test-all
    python test_voice_chat.py --test-whisper test.wav
    python test_voice_chat.py --test-tts "Hello world"
"""

import sys
import os
import argparse
import requests
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / 'backend-2'))

from utils.azure_speech_utils import transcribe_audio, text_to_speech, VOICE_PRESETS
from dotenv import load_dotenv

load_dotenv()

API_BASE = os.getenv('API_BASE_URL', 'http://localhost:8000')
TOKEN = os.getenv('TEST_TOKEN', '')  # Set this in .env for authenticated tests

def test_whisper_direct(audio_path: str):
    """Test Azure Whisper transcription directly"""
    print("\n🎤 Testing Azure Whisper STT (Direct)")
    print("=" * 50)
    
    if not os.path.exists(audio_path):
        print(f"❌ Audio file not found: {audio_path}")
        return False
    
    with open(audio_path, 'rb') as f:
        result = transcribe_audio(f)
    
    if result.get('success'):
        print(f"✅ Transcription successful!")
        print(f"   Text: {result.get('text')}")
        print(f"   Language: {result.get('language')}")
        print(f"   Duration: {result.get('duration')}s")
        return True
    else:
        print(f"❌ Transcription failed: {result.get('error')}")
        print(f"   Details: {result.get('details')}")
        return False


def test_tts_direct(text: str, persona: str = 'friendly'):
    """Test Azure TTS directly"""
    print("\n🔊 Testing Azure TTS (Direct)")
    print("=" * 50)
    
    result = text_to_speech(text, **VOICE_PRESETS[persona])
    
    if result.get('success'):
        print(f"✅ TTS synthesis successful!")
        print(f"   Audio size: {result.get('size')} bytes")
        print(f"   Format: {result.get('format')}")
        
        # Save to file
        output_path = 'test_output.mp3'
        with open(output_path, 'wb') as f:
            f.write(result['audio'])
        print(f"   Saved to: {output_path}")
        return True
    else:
        print(f"❌ TTS failed: {result.get('error')}")
        print(f"   Details: {result.get('details')}")
        return False


def test_api_health():
    """Test /api/voice-chat/voice/health endpoint"""
    print("\n🏥 Testing Voice Chat Health Endpoint")
    print("=" * 50)
    
    headers = {'Authorization': f'Bearer {TOKEN}'} if TOKEN else {}
    
    try:
        response = requests.get(f'{API_BASE}/api/voice-chat/voice/health', headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Health check passed!")
            print(f"   Whisper configured: {data['services']['whisper']['configured']}")
            print(f"   TTS configured: {data['services']['tts']['configured']}")
            print(f"   Voice presets: {', '.join(data['voice_presets'])}")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            print(f"   {response.text}")
            return False
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False


def test_api_transcribe(audio_path: str):
    """Test /api/voice-chat/voice/transcribe endpoint"""
    print("\n🎤 Testing Voice Transcribe API")
    print("=" * 50)
    
    if not os.path.exists(audio_path):
        print(f"❌ Audio file not found: {audio_path}")
        return False
    
    headers = {'Authorization': f'Bearer {TOKEN}'} if TOKEN else {}
    
    try:
        with open(audio_path, 'rb') as f:
            files = {'audio': f}
            response = requests.post(
                f'{API_BASE}/api/voice-chat/voice/transcribe',
                headers=headers,
                files=files
            )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Transcription successful!")
            print(f"   Text: {data.get('text')}")
            print(f"   Language: {data.get('language')}")
            return True
        else:
            print(f"❌ Transcription failed: {response.status_code}")
            print(f"   {response.text}")
            return False
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return False


def test_api_synthesize(text: str, persona: str = 'friendly'):
    """Test /api/voice-chat/voice/synthesize endpoint"""
    print("\n🔊 Testing Voice Synthesize API")
    print("=" * 50)
    
    headers = {
        'Authorization': f'Bearer {TOKEN}',
        'Content-Type': 'application/json'
    } if TOKEN else {'Content-Type': 'application/json'}
    
    try:
        response = requests.post(
            f'{API_BASE}/api/voice-chat/voice/synthesize',
            headers=headers,
            params={'text': text, 'persona': persona}
        )
        
        if response.status_code == 200:
            output_path = 'test_synthesize.mp3'
            with open(output_path, 'wb') as f:
                f.write(response.content)
            print("✅ Synthesis successful!")
            print(f"   Audio size: {len(response.content)} bytes")
            print(f"   Saved to: {output_path}")
            return True
        else:
            print(f"❌ Synthesis failed: {response.status_code}")
            print(f"   {response.text}")
            return False
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return False


def test_api_voice_chat(audio_path: str, persona: str = 'friendly'):
    """Test /api/voice-chat/voice/chat endpoint (full flow)"""
    print("\n💬 Testing Full Voice Chat API")
    print("=" * 50)
    
    if not os.path.exists(audio_path):
        print(f"❌ Audio file not found: {audio_path}")
        return False
    
    headers = {'Authorization': f'Bearer {TOKEN}'} if TOKEN else {}
    
    try:
        with open(audio_path, 'rb') as f:
            files = {'audio': f}
            data = {
                'persona': persona,
                'conversation_history': '[]'
            }
            response = requests.post(
                f'{API_BASE}/api/voice-chat/voice/chat',
                headers=headers,
                files=files,
                data=data
            )
        
        if response.status_code == 200:
            # Get headers
            transcript = response.headers.get('X-Transcript', 'N/A')
            response_text = response.headers.get('X-Response-Text', 'N/A')
            
            # Save audio
            output_path = 'test_chat_response.mp3'
            with open(output_path, 'wb') as f:
                f.write(response.content)
            
            print("✅ Voice chat successful!")
            print(f"   User said: {transcript}")
            print(f"   Bot responded: {response_text[:100]}...")
            print(f"   Audio size: {len(response.content)} bytes")
            print(f"   Saved to: {output_path}")
            return True
        else:
            print(f"❌ Voice chat failed: {response.status_code}")
            print(f"   {response.text}")
            return False
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description='Test Voice Chat Backend')
    parser.add_argument('--test-all', action='store_true', help='Run all tests')
    parser.add_argument('--test-whisper', metavar='AUDIO_FILE', help='Test Whisper STT')
    parser.add_argument('--test-tts', metavar='TEXT', help='Test TTS')
    parser.add_argument('--test-health', action='store_true', help='Test health endpoint')
    parser.add_argument('--test-api-transcribe', metavar='AUDIO_FILE', help='Test transcribe API')
    parser.add_argument('--test-api-synthesize', metavar='TEXT', help='Test synthesize API')
    parser.add_argument('--test-api-chat', metavar='AUDIO_FILE', help='Test voice chat API')
    parser.add_argument('--persona', default='friendly', choices=list(VOICE_PRESETS.keys()),
                       help='Voice persona (default: friendly)')
    
    args = parser.parse_args()
    
    if len(sys.argv) == 1:
        parser.print_help()
        return
    
    print("\n" + "=" * 50)
    print("🤖 DOIT Voice Chat Backend Test Suite")
    print("=" * 50)
    
    results = []
    
    if args.test_all or args.test_health:
        results.append(('Health Check', test_api_health()))
    
    if args.test_whisper:
        results.append(('Whisper Direct', test_whisper_direct(args.test_whisper)))
    
    if args.test_tts:
        results.append(('TTS Direct', test_tts_direct(args.test_tts, args.persona)))
    
    if args.test_api_transcribe:
        results.append(('Transcribe API', test_api_transcribe(args.test_api_transcribe)))
    
    if args.test_api_synthesize:
        results.append(('Synthesize API', test_api_synthesize(args.test_api_synthesize, args.persona)))
    
    if args.test_api_chat:
        results.append(('Voice Chat API', test_api_voice_chat(args.test_api_chat, args.persona)))
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Test Results Summary")
    print("=" * 50)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed!")
        sys.exit(0)
    else:
        print("⚠️  Some tests failed. Check logs above.")
        sys.exit(1)


if __name__ == '__main__':
    main()