#!/usr/bin/env bash
# Place in .platform/hooks/postdeploy directory
sudo certbot -n -d huuscleaning.com --nginx --agree-tos --email kenfife128@hotmail.com
