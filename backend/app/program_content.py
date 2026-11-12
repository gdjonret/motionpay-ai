"""Original sandbox training template; not individualized or professionally reviewed."""
def content():
    days = [
        ('Monday', [('bodyweight-squat', '2 × 6–8'), ('incline-push-up', '2 × 5–6'), ('dead-bug', '2 × 5 per side')]),
        ('Wednesday', [('glute-bridge', '2 × 8–10'), ('dumbbell-row', '2 × 6–8 per side'), ('dead-bug', '2 × 5 per side')]),
        ('Friday', [('bodyweight-squat', '2 × 6–8'), ('incline-push-up', '2 × 5–6'), ('glute-bridge', '2 × 8–10')]),
    ]
    focuses = [
        ('Learn the movements', 'Use the lower end of each range. Read the exercise instructions and practice controlled technique.'),
        ('Build consistency', 'Repeat a comfortable workload. Compare how the movements feel across the three sessions; increase nothing if technique feels uncertain.'),
        ('Explore comfortable progress', 'If your existing sets feel comfortable and controlled, you may try one extra repetition within the listed range. Keeping week 2 unchanged is also fine.'),
        ('Review and consolidate', 'Use the comfortable repetitions you established. Review which movements need more practice before choosing another training block.'),
    ]
    return {'title': 'Beginner Strength Essentials', 'note': 'Sandbox training template, not a personalized prescription or professionally reviewed program. Adjust to your ability and stop if movement causes pain.',
        'warmup': 'Start with a few minutes of comfortable movement and practice each exercise without added weight.',
        'weeks': [{'week': index + 1, 'focus': focus, 'guidance': guidance + ' Rest 60–90 seconds between sets and take rest days between sessions.',
                   'sessions': [{'day': day, 'exercises': [{'exercise_id': id, 'prescription': reps} for id, reps in exercises]} for day, exercises in days]}
                  for index, (focus, guidance) in enumerate(focuses)]}
