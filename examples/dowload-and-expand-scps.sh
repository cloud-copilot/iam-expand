#!/bin/bash

: <<'END_COMMENT'
This script will download all SCPs in the organization, expand them, and save them to files.

Must be run with credentials that have permission to read SCPs in the organization's root account.
END_COMMENT

mkdir -p scps

policies=$(aws organizations list-policies --filter "SERVICE_CONTROL_POLICY" --query 'Policies[].{Id:Id,Name:Name}' --output json)

echo "$policies" | jq -c '.[]' | while read -r line; do
  id=$(echo "$line" | jq -r '.Id')
  name=$(echo "$line" | jq -r '.Name')

  file_name="scps/${name}.json"
  policy_json=$(aws organizations describe-policy --policy-id "$id" --output json)
  # SCPs are returned as an inline string, need to extract them and parse them
  content=$(echo "$policy_json" | jq -r '.Policy.Content')
  # Expanded SCPs can get too big for bash variables, so using a tmp file
  temp_file=$(mktemp)
  echo "$content" | iam-expand --expand-service-asterisk > "$temp_file"
  updated_json=$(jq --argfile newContent "$temp_file" '.Policy.Content = $newContent' <<< "$policy_json")
  echo "$updated_json" > "$file_name"
  rm "$temp_file"
done