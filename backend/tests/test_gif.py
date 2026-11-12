from io import BytesIO
from PIL import Image, ImageSequence
from fastapi.testclient import TestClient
from app.main import app
from app.gif import slow_gif


def test_frame_timing_doubles():
    original = BytesIO()
    Image.new('RGB', (8, 8), 'red').save(original, format='GIF', save_all=True, append_images=[Image.new('RGB', (8, 8), 'blue')], duration=[50, 100], loop=0)
    output = Image.open(BytesIO(slow_gif(original.getvalue())))
    assert [frame.info['duration'] for frame in ImageSequence.Iterator(output)] == [100, 200]
    assert output.info['loop'] == 0


def test_slow_followup():
    response = TestClient(app).post('/api/chat', json={'message': 'Make it slower', 'history': [{'role': 'assistant', 'content': 'Here is a squat.', 'exercise_id': 'bodyweight-squat'}]})
    assert response.status_code == 200
    assert response.json()['gif_url'] == '/api/exercises/bodyweight-squat/slow.gif'


def test_slow_without_context():
    response = TestClient(app).post('/api/chat', json={'message': 'Make it slower'})
    assert response.json()['exercise_id'] is None
    assert response.json()['gif_url'] is None


def test_slow_without_gif():
    response = TestClient(app).post('/api/chat', json={'message': 'Make it slower', 'history': [{'role': 'assistant', 'content': 'Here is an RDL.', 'exercise_id': 'dumbbell-rdl'}]})
    assert response.json()['gif_url'] is None
    assert 'only for the squat GIF' in response.json()['text']
