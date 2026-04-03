# Maestro Test Fixtures

Real screenshots from padel booking platforms, used by the OCR import match history tests.

## Files

| Fixture | Source | Used By |
|---|---|---|
| `nettla_match_history_wins.png` | Nettla — "Latest matches" screen showing wins | `22_import_matches_ocr_nettla.yaml` |
| `nettla_match_history_loss.png` | Nettla — match history with losses | (available for additional tests) |
| `playtomic_match_history.png` | Playtomic — "Your matches" screen with ratings | `23_import_matches_ocr_playtomic.yaml` |

## How these are used

Maestro's `addMedia` command pushes the image to the iOS simulator's photo library before the test navigates to the Import Matches screen. The test then picks the image via "Photo Library", which triggers the Supabase edge function `ocr-extract-players` to extract match data using Claude Sonnet vision.

## Adding new fixtures

Drop screenshots from any supported platform (Nettla, Playtomic, Padel Mates, Matchii) into this directory. Use lowercase with underscores: `platform_description.png`.
