# Expand IAM Actions
Built in the Unix philosophy, this is a small tool that does one thing well: expand IAM actions with wildcards to their list of matching actions.

Use this to:
1) Expand out wildcards in actions when you are not allowed to use wildcards in your IAM policy.
2) Get an exhaustive list of actions that are included in a policy and quickly search it for interesting actions.
3) Investigate where dangerous or dubious actions are being used in your policies.

Published in ESM and CommonJS plus available as a [CLI](#cli).

All information is sourced from the [@cloud-copilot/iam-data](https://github.com/cloud-copilot/iam-data) which is updated daily.

## Installation
```bash
npm install -g @cloud-copilot/iam-expand
```

### AWS CloudShell Installation
The AWS CloudShell automatically has node and npm installed, so you can install this and run it straight from the console. You'll need to use sudo to install it globally.
```bash
sudo npm install -g @cloud-copilot/iam-expand
iam-expand
```

## CLI
There is a CLI! The [examples folder](examples/README.md) has examples showing how to use the CLI to find interesting actions in your IAM policies.

### Installation
You can install it globally and use the command `iam-expand` or add it to a single project and use `npx`.

#### Install Globally
```bash
npm install -g @cloud-copilot/iam-expand
```
yarn (yarn does not automatically add peer dependencies, so need to add the data package explicitly)
```
yarn global add @cloud-copilot/iam-data
yarn global add @cloud-copilot/iam-expand
```

The AWS CloudShell automatically has node and npm installed, so you can install this and run it straight from the console. You'll need to use sudo to install it globally.

```bash
sudo npm install -g @cloud-copilot/iam-expand
```
#### Install in a project
```bash
npm install @cloud-copilot/iam-expand
```

### Simple Usage
The simplest usage is to pass in the actions you want to expand.
```bash
iam-expand s3:Get* s3:*Tag*
```

You can pass in all options available through the api as dash separated flags.

_Prints all matching actions for `s3:Get*Tagging`, `s3:*Tag*`, and `ec2:*` in alphabetical order with duplicates removed:_
```bash
iam-expand s3:Get*Tagging s3:*Tag* ec2:* --expand-service-asterisk
```

### Help
Run the command with no options to show usage:
```bash
iam-expand
```

### Read from stdin
If no actions are passed as arguments, the CLI will read from stdin.

#### Expanding JSON input
If the input is a valid json document, the CLI will find every instance of `Action` and `NotAction` that is a string or an array of strings and expand them. This is useful for finding all the actions in a policy document or set of documents.

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
aws iam get-account-authorization-details --output json | iam-expand --expand-service-asterisk --read-wait-time=20_000 > expanded-authorization-details.json
# Now you can search the output for actions you are interested in
grep -n "kms:DisableKey" expanded-inline-policies.json
```

#### Expanding arbitrary input
If the input from stdin is not json, the content is searched for IAM actions then expands them. Throw anything at it and it will find all the actions it can and expand them.

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
curl "https://docs.aws.amazon.com/aws-managed-policy/latest/reference/ReadOnlyAccess.html" | iam-expand
```

Or the output of any command.

Because of the likelyhood of finding an aseterik `*` in the input; if the value to stdin is not a valid json document the stdin option will not find or expand a single `*` even if `--expand-asterisk` is passed.

Please give this anything you can think of and open an issue if you see an opportunity for improvement.



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
By default, a single `*` will not be expanded. If you want to expand a single `*` you can set this option to `true`.

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

## `invalidActionBehavior`
By default, if an action is passed in that does not exist in the IAM data, it will be silently ignored and left out of the output. There are two options to override this behavior: `Error` and `Include`.

```typescript
import { expandIamActions, InvalidActionBehavior } from '@cloud-copilot/iam-expand';

//Ignore invalid action by default
expandIamActions('ec2:DestroyAvailabilityZone')
[]

//Ignore invalid action explicitly
expandIamActions('ec2:DestroyAvailabilityZone', { invalidActionBehavior: InvalidActionBehavior.Remove })
[]

//Throw an error on invalid action
expandIamActions('ec2:DestroyAvailabilityZone', { invalidActionBehavior: InvalidActionBehavior.Error })
//Uncaught Error: Invalid action: ec2:DestroyAvailabilityZone

//Include invalid action
expandIamActions('ec2:DestroyAvailabilityZone', { invalidActionBehavior: InvalidActionBehavior.Include })
['ec2:DestroyAvailabilityZone']
```


