STYLE_OPTIONS = {
    "lamplit-ink": ("Lamplit Ink", ("9:16",)),
    "red-ghost": ("Red Ghost", ("9:16", "16:9")),
    "sunlit-explainer": ("Sunlit Explainer", ("16:9", "9:16")),
    "stickman": ("Stickman", ("16:9", "9:16")),
    "clay-atlas": ("Clay Atlas", ("16:9",)),
}
STYLE_IDS = set(STYLE_OPTIONS)
STYLE_ASPECTS = {style: set(options[1]) for style, options in STYLE_OPTIONS.items()}
SOURCE_TYPES = {"Raw idea", "Story/script"}
MAX_SOURCE_BYTES = 16 * 1024
