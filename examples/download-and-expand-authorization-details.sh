#!/bin/bash

: <<'END_COMMENT'
This script will download all the account authorization details which contains
inline policies and expand them then save them to a file.
END_COMMENT

aws iam get-account-authorization-details --output json | iam-expand --expand-service-asterisk --read-wait-time=20_000 > expanded-authorization-details.json