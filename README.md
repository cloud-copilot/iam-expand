# Expand IAM Actions
This will expand the actions of the IAM policy to show the individual actions. Useful for when you want to see the individual actions that are included in a wildcard action or are not allowed to use wildcards for security or compliance reasons.

Published in ESM and CommonJS and available as a [CLI](#cli).

Use this to:
1) Expand out wildcards in actions when you are not allowed to use wildcards in your IAM policy.
2) Get an exhaustive list of actions that are included in a policy and quickly search it for interesting actions.
3) Investigate where dangerous or dubious actions are being used in your policies.

## Installation
```bash
npm install -g @cloud-copilot/iam-expand
```

### AWS CloudShell Installation
The AWS CloudShell automatically has node and npm installed, so you can install this and run it straight from the console. You'll need to use sudo to install it globally.

```bash
sudo npm install -g @cloud-copilot/iam-expand
```

## Typescript/NodeJS Usage
```typescript
import { expandIamActions } from '@cloud-copilot/iam-expand';

expandIamActions('s3:Get*Tagging')
[
  's3:GetBucketTagging',
  's3:GetJobTagging',
  's3:GetObjectTagging',
  's3:GetObjectVersionTagging',
  's3:GetStorageLensConfigurationTagging'
]

expandIamActions(['s3:Get*Tagging', 's3:Put*Tagging'])
[
  's3:GetBucketTagging',
  's3:GetJobTagging',
  's3:GetObjectTagging',
  's3:GetObjectVersionTagging',
  's3:GetStorageLensConfigurationTagging',
  's3:PutBucketTagging',
  's3:PutJobTagging',
  's3:PutObjectTagging',
  's3:PutObjectVersionTagging',
  's3:PutStorageLensConfigurationTagging'
]
```

## API
`expandIamActions(actionStringOrStrings: string | string[], overrideOptions?: Partial<ExpandIamActionsOptions>)` is the main function that will expand the actions of the IAM policy. Takes a string or array of strings and returns an array of strings that the input matches.

## Only Valid Values
`expandIamActions` intends to only return valid actual actions, if any invalid values are passed in such as an invalid format or a service/action that does not exist, they will be left out of the output. There are options to override this behavior.

## Options
`expandIamActions` an optional second argument that is an object with the following options:

### `expandAsterisk`
By default, a single `*` not be expanded. We assume that if you want a list of all IAM actions there are other sources you will check, such as [@cloud-copilot/iam-data](https://github.com/cloud-copilot/iam-data). If you want to expand a single `*` you can set this option to `true`.

```typescript
import { expandIamActions } from '@cloud-copilot/iam-expand';

//Returns the unexpanded value
expandIamActions('*')
['*']

//Returns the expanded value
expandIamActions('*', { expandAsterisk: true })
[
  //Many many strings. 🫢
]
```
### `expandServiceAsterisk`
By default, a service name followed by a `*` (such as `s3:*` or `lambda:*`) will not be expanded. If you want to expand these you can set this option to `true`.

```typescript
import { expandIamActions } from '@cloud-copilot/iam-expand';

//Returns the unexpanded value
expandIamActions('s3:*')
['s3:*']

//Returns the expanded value
expandIamActions('s3:*', { expandServiceAsterisk: true })
[
  //All the s3 actions. 🫢
]
```

### `distinct`
If you include multiple patterns that have overlapping matching actions, the same action will be included multiple times in the output. If you want to remove duplicates you can set this option to `true`.

```typescript
import { expandIamActions } from '@cloud-copilot/iam-expand';

//Returns duplication values (s3:GetObjectTagging)
expandIamActions(['s3:GetObject*','s3:Get*Tagging'])
[
  's3:GetObject',
  's3:GetObjectAcl',
  's3:GetObjectAttributes',
  's3:GetObjectLegalHold',
  's3:GetObjectRetention',
  's3:GetObjectTagging',
  ...
  's3:GetObjectTagging',
  's3:GetObjectVersionTagging',
  's3:GetStorageLensConfigurationTagging'
]

//Duplicates removed and order maintained
expandIamActions(['s3:GetObject*','s3:Get*Tagging'],{distinct:true})
[
  's3:GetObject',
  's3:GetObjectAcl',
  's3:GetObjectAttributes',
  's3:GetObjectLegalHold',
  's3:GetObjectRetention',
  's3:GetObjectTagging',
  's3:GetObjectTorrent',
  's3:GetObjectVersion',
  's3:GetObjectVersionAcl',
  's3:GetObjectVersionAttributes',
  's3:GetObjectVersionForReplication',
  's3:GetObjectVersionTagging',
  's3:GetObjectVersionTorrent',
  's3:GetBucketTagging',
  's3:GetJobTagging',
  's3:GetStorageLensConfigurationTagging'
]
```

### `sort`
By default, the output will be sorted based on the order of the input. If you want the output to be sorted alphabetically you can set this option to `true`.

```typescript
import { expandIamActions } from '@cloud-copilot/iam-expand';

//By default the output is sorted based on the order of the input
expandIamActions(['s3:Get*Tagging','ec2:*Tags'])
[
  's3:GetBucketTagging',
  's3:GetJobTagging',
  's3:GetObjectTagging',
  's3:GetObjectVersionTagging',
  's3:GetStorageLensConfigurationTagging',
  'ec2:CreateTags',
  'ec2:DeleteTags',
  'ec2:DescribeTags'
]

//Output is sorted alphabetically
expandIamActions(['s3:Get*Tagging','ec2:*Tags'], {sort: true})
[
  'ec2:CreateTags',
  'ec2:DeleteTags',
  'ec2:DescribeTags',
  's3:GetBucketTagging',
  's3:GetJobTagging',
  's3:GetObjectTagging',
  's3:GetObjectVersionTagging',
  's3:GetStorageLensConfigurationTagging'
]

```

### `errorOnInvalidFormat`
By default, if an invalid format is passed in, such as:
*  `s3Get*Tagging` (missing a separator) or
*  `s3:Get:Tagging*` (too many separators)

it will be silenty ignored and left out of the output. If you want to throw an error when an invalid format is passed in you can set this option to `true`.

```typescript
import { expandIamActions } from '@cloud-copilot/iam-expand';

//Ignore invalid format
expandIamActions('s3Get*Tagging')
[]

//Throw an error on invalid format
expandIamActions('s3Get*Tagging', { errorOnInvalidFormat: true })
//Uncaught Error: Invalid action format: s3Get*Tagging
```

### `errorOnMissingService`
By default, if a service is passed in that does not exist in the IAM data, it will be silently ignored and left out of the output. If you want to throw an error when a service is passed in that does not exist you can set this option to `true`.

```typescript
import { expandIamActions } from '@cloud-copilot/iam-expand';

//Ignore missing service
expandIamActions('r2:Get*Tagging')
[]

//Throw an error on missing service
expandIamActions('r2:Get*Tagging', { errorOnMissingService: true })
//Uncaught Error: Service not found: r2
```

## CLI
There is a CLI!

### Install Globally
```bash
npm install -g @cloud-copilot/iam-expand
```
yarn (yarn does not automatically add peer dependencies, so need to add the data package explicitly)
```
yarn global add @cloud-copilot/iam-data
yarn global add @cloud-copilot/iam-expand
```

### AWS CloudShell Installation
The AWS CloudShell automatically has node and npm installed, so you can install this and run it straight from the console. You'll need to use sudo to install it globally.

```bash
sudo npm install -g @cloud-copilot/iam-expand
```

### Run the script in a project that has the package installed
```bash
npx @cloud-copilot/iam-expand
```

### Simple Usage
The simplest usage is to pass in the actions you want to expand.
```bash
iam-expand s3:Get* s3:*Tag*
```

You can pass in all options available through the api as dash separated flags.

_Prints all matching actions for s3:Get\*Tagging, s3:\*Tag\*, and ec2:\* in alphabetical order with duplicates removed:_
```bash
iam-expand s3:Get*Tagging s3:*Tag* ec2:* --expand-service-asterisk --distinct --sort
```

### Help
Running the command with no options shows usage help;
```bash
iam-expand
```

### Read from stdin
If no actions are passed as arguments, the CLI will read from stdin.

#### Expanding JSON input
If the input is a valid json document, the CLI will find every instance of `Action` and 'NotAction' that is a string or an array of strings and expand them. This is useful for finding all the actions in a policy document or set of documents.

Given `policy.json`
```json

 {
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:Get*Tagging",
      "Resource": "*"
    },
    {
      "Effect": "Deny",
      "NotAction": ["s3:Get*Tagging", "s3:Put*Tagging"],
      "Resource": "*"
    }
  ]
 }
```

```bash
cat policy.json | iam-expand > expanded-policy.json
```

Gives this file in `expanded-policy.json`
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      // Was "s3:Get*Tagging"
      "Action": [
        "s3:GetBucketTagging",
        "s3:GetJobTagging",
        "s3:GetObjectTagging",
        "s3:GetObjectVersionTagging",
        "s3:GetStorageLensConfigurationTagging"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Deny",
      // Was ["s3:Get*Tagging", "s3:Put*Tagging"]
      "NotAction": [
        "s3:GetBucketTagging",
        "s3:GetJobTagging",
        "s3:GetObjectTagging",
        "s3:GetObjectVersionTagging",
        "s3:GetStorageLensConfigurationTagging",
        "s3:PutBucketTagging",
        "s3:PutJobTagging",
        "s3:PutObjectTagging",
        "s3:PutObjectVersionTagging",
        "s3:PutStorageLensConfigurationTagging"
      ],
      "Resource": "*"
    }
  ]
 }
```

You can also use this to expand the actions from the output of commands.
```bash
aws iam get-account-authorization-details --output json | iam-expand --expand-service-asterisk --read-wait-time=20_000 > expanded-inline-policies.json
# Now you can search the output for actions you are interested in
grep -n "kms:DisableKey" expanded-inline-policies.json
```
_--expand-service-asterisk makes sure kms:* is expaneded out so you can find the DisableKey action. --read-wait-time=20_000 gives the cli command more time to return it's first byte of output_

#### Expanding arbitrary input
If the input from stdin is not json, the content is searched for actions that are then expanded. This is really meant to be abused. It essentialy greps the content for anything resembling and action and expands it. Throw anything at it and it will find all the actions it can and expand them.

You can echo some content:
```bash
echo "s3:Get*Tagging" | iam-expand
```

You can pull out part of a json file and pipe it in:
```bash
cat policy.json | jq '.Statement[].Action' | iam-expand
```

Or some Terraform:
```bash
cat main.tf | iam-expand
```

Or some CloudFormation:
```bash
cat template.yaml | iam-expand
```

Or even some HTML:
```bash
curl "https://docs.aws.amazon.com/aws-managed-policy/latest/reference/SecurityAudit.html" | iam-expand
```

Or the output of any command.

Because of the likelyhood of finding an aseterik `*` in the input; if the value to stdin is not a valid json document the stdin option will not find or expand a single `*` even if `--expand-asterisk` is passed.

Please give this anything you can think of and open an issue if you see an opportunity for improvement.
