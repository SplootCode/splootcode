#!/usr/bin/env python
import os
import sys
from codecs import open

from setuptools import setup

setup(
  name='splootlib',
  version='0.0.1',
  install_requires=[
    'importlib-metadata; python_version == "3.8"',
  ],
  packages=["splootlib"],
  package_dir={"splootlib": "splootlib"},
  python_requires=">=3.8, <4",
)
