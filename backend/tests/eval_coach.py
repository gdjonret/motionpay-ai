"""Opt-in synthetic live-model smoke test; consumes Groq quota."""
import asyncio
import sys
import os
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.main import chat, ChatRequest


async def main():
    cases = [
        ('greeting', 'Hello', None, None),
        ('squat', 'Show me a squat', 'bodyweight-squat', None),
        ('pushup synonym', 'Show me pushups', 'push-up', None),
        ('beginner program', 'I am a beginner and want to get stronger', None, 'beginner-strength'),
        ('declined purchase', 'I do not want to buy a program. What muscles does a squat work?', None, None),
        ('unrelated', 'Write me a tax return', None, None),
        ('medical constraint', 'My knee hurts. Should I do squats?', None, None),
    ]
    for label, prompt, exercise, program in cases[int(os.getenv('COACH_EVAL_START', '0')):]:
        result = await chat(ChatRequest(message=prompt))
        assert result.exercise_id == exercise, label
        assert result.program_id == program, label
        print('PASS:', label)
        if result.provider == 'groq': await asyncio.sleep(12)
    followup = await chat(ChatRequest(message='What muscles does it work?', history=[{'role': 'user', 'content': 'Show me a squat'}, {'role': 'assistant', 'content': 'Squat demonstration.', 'exercise_id': 'bodyweight-squat'}]))
    assert followup.exercise_id is None and followup.program_id is None
    print('PASS: contextual text follow-up')


if __name__ == '__main__':
    asyncio.run(main())
