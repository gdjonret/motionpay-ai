import json
import os
import re
from pathlib import Path


def load_catalog() -> list[dict]:
    path = Path(os.getenv('EXERCISE_CATALOG_PATH') or Path(__file__).resolve().parents[2] / 'mobile/src/data/catalog.json')
    return json.loads(path.read_text())


ALIASES = {
    'bodyweight-squat': ['squat', 'squats', 'bodyweight squat', 'bodyweight squats'],
    'push-up': ['push up', 'push ups', 'pushup', 'pushups'],
    'incline-push-up': ['incline push up', 'incline push ups', 'incline pushup'],
    'jumping-jacks': ['jumping jack', 'jumping jacks'],
    'glute-bridge': ['glute bridge', 'glute bridges'],
    'dumbbell-rdl': ['dumbbell rdl', 'rdl', 'dumbbell romanian deadlift'],
    'dumbbell-row': ['dumbbell row', 'dumbbell rows'],
    'dead-bug': ['dead bug', 'dead bugs'],
}

STOPWORDS = {'a', 'an', 'the', 'me', 'show', 'how', 'do', 'i', 'to', 'can', 'you', 'please', 'what', 'is', 'my', 'for', 'and', 'with', 'of', 'on', 'it', 'in', 'want'}


def normalize(text):
    return re.sub(r'[^a-z0-9]+', ' ', text.lower().replace("'", '')).strip()


def _stem(word):
    return word[:-1] if len(word) > 3 and word.endswith('s') else word


def exact_demo(message, valid_ids, catalog=()):
    normalized = re.sub(r'[-–]', ' ', message.lower()).strip().rstrip('.!?')
    match = re.fullmatch(r'(?:please )?(?:show me|demonstrate|how do i do|how to do) (?:a |an |the )?(.+?)(?: please)?', normalized)
    if not match:
        return None
    alias = next((id for id, aliases in ALIASES.items() if id in valid_ids and match[1] in aliases), None)
    if alias:
        return alias
    requested = ' '.join(_stem(word) for word in normalize(match[1]).split())
    return next((item['id'] for item in catalog if requested in {' '.join(_stem(word) for word in normalize(name).split()) for name in (item['name'], item['id'])}), None)


def shortlist(catalog, texts, keep_ids=(), limit=24):
    """Pick the catalog entries most relevant to the conversation so the model prompt stays small."""
    words = {_stem(word) for text in texts for word in normalize(text).split()} - STOPWORDS
    keep = set(ALIASES) | set(keep_ids)

    def score(item):
        name = {_stem(word) for word in normalize(item['name']).split()}
        tags = {_stem(word) for word in normalize(' '.join(filter(None, (item.get('muscle'), item.get('target'), item.get('equipment'))))).split()}
        return 3 * len(name & words) + len(tags & words)

    ranked = sorted((item for item in catalog if item['id'] not in keep), key=score, reverse=True)
    extra = [item for item in ranked if score(item) > 0][:limit]
    return [item for item in catalog if item['id'] in keep] + extra
