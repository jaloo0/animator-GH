from __future__ import annotations

import argparse

from zip_validation import extract_project_zip


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("archive")
    parser.add_argument("destination")
    args = parser.parse_args()
    with open(args.archive, "rb") as source:
        extract_project_zip(source.read(), args.destination)


if __name__ == "__main__":
    main()
