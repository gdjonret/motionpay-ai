from io import BytesIO
from PIL import Image, ImageSequence


def slow_gif(source: bytes) -> bytes:
    with Image.open(BytesIO(source)) as image:
        if image.format != 'GIF' or image.width * image.height > 2_000_000 or image.n_frames > 300:
            raise ValueError('Unsupported GIF')
        frames, durations = [], []
        for frame in ImageSequence.Iterator(image):
            frames.append(frame.convert('RGBA'))
            durations.append(max(20, frame.info.get('duration', 100)) * 2)
        output = BytesIO()
        frames[0].save(output, format='GIF', save_all=True, append_images=frames[1:], duration=durations, loop=0, disposal=2)
        return output.getvalue()
