#!/usr/bin/python3

# Copied from
# https://www.codementor.io/@abhishake/minimal-apache-configuration-for-deploying-a-flask-app-ubuntu-18-04-phu50a7ft

import logging
import sys
logging.basicConfig(stream=sys.stderr)
sys.path.insert(0, '/home/markham/DatePicker')
from app import app as application
application.secret_key = 'anything you wish'
