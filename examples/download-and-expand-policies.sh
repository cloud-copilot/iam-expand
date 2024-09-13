#!/bin/bash

: <<'END_COMMENT'
This script will download all customer-managed policies in the account, expand them, and save them to files
in the `policies` directory. The file name will be the policy name with the path as a prefix.
END_COMMENT

mkdir -p policies

# List all managed policies that are attached to any entity
policies=$(aws iam list-policies --scope All --only-attached --query 'Policies[].{Arn:Arn,VersionId:DefaultVersionId,Path:Path,Name:PolicyName}' --output json)

# Loop through each policy to get the default version and save it
echo "$policies" | jq -c '.[]' | while read -r line; do
  arn=$(echo "$line" | jq -r '.Arn')
  version_id=$(echo "$line" | jq -r '.VersionId')
  path=$(echo "$line" | jq -r '.Path' | tr '/' '_')
  name=$(echo "$line" | jq -r '.Name')

  file_name="policies/${path}${name}.json"
  aws iam get-policy-version --policy-arn "$arn" --version-id "$version_id" --query 'PolicyVersion.Document' --output json 2>/dev/null | iam-expand --read-wait-ms=10_000 > $file_name
done