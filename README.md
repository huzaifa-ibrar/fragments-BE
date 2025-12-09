# Complete AWS Deployment Guide for Fragments Application

This guide walks you through deploying your Fragments microservice on AWS with Docker, DynamoDB, and S3. Follow each step carefully!

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [AWS Account Setup](#aws-account-setup)
3. [Create DynamoDB Table](#create-dynamodb-table)
4. [Create S3 Bucket](#create-s3-bucket)
5. [Create ECR Repository](#create-ecr-repository)
6. [Create Cognito User Pool](#create-cognito-user-pool)
7. [Setup IAM Roles](#setup-iam-roles)
8. [Push Docker Image to ECR](#push-docker-image-to-ecr)
9. [Create ECS Cluster](#create-ecs-cluster)
10. [Deploy to ECS](#deploy-to-ecs)
11. [Configure Frontend](#configure-frontend)
12. [Testing](#testing)

---

## 1. Prerequisites {#prerequisites}

**What you need installed:**

- AWS Account (Free tier works!)
- Docker Desktop
- AWS CLI
- Git
- Your code ready

**Install AWS CLI (if not already installed):**

**Windows:**

```powershell
# Download and run the AWS CLI installer
# Go to: https://awscli.amazonaws.com/AWSCLIV2.msi
# Or use chocolatey
choco install awscliv2
```

**Verify installation:**

```powershell
aws --version
```

---

## 2. AWS Account Setup {#aws-account-setup}

### Step 2.1: Create AWS Account

1. Go to [AWS Console](https://console.aws.amazon.com/)
2. Click "Create an AWS Account"
3. Follow the signup wizard
4. Add a payment method (you'll use free tier)

### Step 2.2: Configure AWS CLI

Open PowerShell and run:

```powershell
aws configure
```

You'll be prompted to enter:

- **AWS Access Key ID**: Get from AWS Console → IAM → Users → Your User → Security Credentials
- **AWS Secret Access Key**: Same location
- **Default region**: `us-east-1` (or your preferred region)
- **Default output format**: `json`

**How to get AWS Keys:**

1. Login to [AWS Console](https://console.aws.amazon.com/)
2. Click your username (top right) → Security Credentials
3. Click "Access Keys" → "Create access key"
4. Copy the Access Key ID and Secret Access Key
5. Run `aws configure` and paste them

### Step 2.3: Create an S3 Bucket for Docker Images

```powershell
# Create a bucket (bucket names must be globally unique)
aws s3 mb s3://my-fragments-app-YOURUSERNAME
```

---

## 3. Create DynamoDB Table {#create-dynamodb-table}

DynamoDB stores your fragment metadata. Follow these steps:

### Step 3.1: Via AWS Console (Easiest for beginners)

1. Open [AWS Console](https://console.aws.amazon.com/) → DynamoDB
2. Click "Create table"
3. Fill in these details:

**General Information:**

- **Table name**: `fragments`
- **Partition key**: `ownerId` (String)
- **Sort key**: `id` (String)

**Billing Settings:**

- Select: "Pay-per-request" (On-demand pricing)
- Click "Create table"

### Step 3.2: Verify Creation

```powershell
# List your DynamoDB tables
aws dynamodb list-tables --region us-east-1
```

You should see `fragments` in the output.

---

## 4. Create S3 Bucket {#create-s3-bucket}

S3 stores your fragment data (files).

### Step 4.1: Create via AWS Console

1. Open [AWS Console](https://console.aws.amazon.com/) → S3
2. Click "Create bucket"
3. Fill in:
   - **Bucket name**: `fragments-data-YOURUSERNAME` (must be unique)
   - **Region**: `us-east-1` (same as other services)
4. **IMPORTANT**: Under "Block Public Access settings", keep all boxes **CHECKED** (private)
5. Click "Create bucket"

### Step 4.2: Verify Bucket Created

```powershell
# List your S3 buckets
aws s3 ls
```

---

## 5. Create ECR Repository {#create-ecr-repository}

ECR (Elastic Container Registry) stores your Docker images.

### Step 5.1: Via AWS Console

1. Open [AWS Console](https://console.aws.amazon.com/) → ECR
2. Click "Create repository"
3. Fill in:
   - **Repository name**: `fragments`
   - **Image tag mutability**: Select "Immutable" (recommended)
   - Leave other settings as default
4. Click "Create repository"

### Step 5.2: Note the Repository URI

After creation, you'll see a URI like:

```
123456789012.dkr.ecr.us-east-1.amazonaws.com/fragments
```

**Save this URI - you'll need it later!**

### Step 5.3: Setup Docker Authentication

```powershell
# Login Docker to ECR (from your project directory)
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com
```

Replace `123456789012` with your AWS Account ID (12-digit number visible in AWS Console top right)

---

## 6. Create Cognito User Pool {#create-cognito-user-pool}

Cognito handles user authentication.

### Step 6.1: Create User Pool

1. Open [AWS Console](https://console.aws.amazon.com/) → Cognito
2. Click "Create user pool"
3. Choose **Authentication provider options**:
   - Select "Email"
   - Keep default Cognito user pool sign-in options
4. Click "Next"

### Step 6.2: Configure Password Policy

1. Select **"Custom"** for password policy
2. Set minimum length to 8 (or lower for testing)
3. Click "Next"

### Step 6.3: Configure Account Recovery

- Keep defaults
- Click "Next"

### Step 6.4: Message Delivery

- Select "Send email with Cognito"
- Click "Next"

### Step 6.5: Name Your User Pool

- **User pool name**: `fragments-users`
- Click "Create user pool"

### Step 6.6: Create App Client

1. After creation, go to **"App integration"** → **"App clients and analytics"**
2. Click "Create app client"
3. Fill in:
   - **App client name**: `fragments-app`
   - **Client type**: "Web application"
4. Scroll down and click "Create app client"

### Step 6.7: Save Your Credentials

After creation, you'll see:

- **Client ID**: Copy this
- **User Pool ID**: Copy this (from User Pool settings)

Save these - you'll need them for the frontend!

---

## 7. Setup IAM Roles {#setup-iam-roles}

IAM roles give your ECS tasks permission to access DynamoDB and S3.

### Step 7.1: Create Task Execution Role

1. Open [AWS Console](https://console.aws.amazon.com/) → IAM
2. Click "Roles" → "Create role"
3. Select **"AWS service"** as the trusted entity
4. Choose **"Elastic Container Service"** → **"Elastic Container Service Task"**
5. Click "Next"
6. Under "Permissions policies", check:
   - `AmazonECSTaskExecutionRolePolicy`
7. Click "Next" → Name it: `ecsTaskExecutionRole`
8. Click "Create role"

### Step 7.2: Create Task Role (For App Access)

1. Click "Create role" again
2. Select **"AWS service"** → **"Elastic Container Service"** → **"Elastic Container Service Task"**
3. Click "Next"
4. Click "Create policy" button
5. Select **"JSON"** tab and paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/fragments"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::fragments-data-YOURUSERNAME",
        "arn:aws:s3:::fragments-data-YOURUSERNAME/*"
      ]
    }
  ]
}
```

Replace:

- `ACCOUNT_ID` with your 12-digit AWS Account ID
- `fragments-data-YOURUSERNAME` with your S3 bucket name

6. Click "Next" → Name it: `fragments-app-policy`
7. Click "Create policy"
8. Go back to role creation, refresh, and select your new policy
9. Click "Next" → Name it: `ecsTaskRole`
10. Click "Create role"

---

## 8. Push Docker Image to ECR {#push-docker-image-to-ecr}

### Step 8.1: Build Your Docker Image

```powershell
# Navigate to backend directory
cd fragment_backend

# Build the Docker image
docker build -t fragments:latest .
```

Wait for the build to complete (might take 2-3 minutes).

### Step 8.2: Tag the Image

```powershell
# Tag it for ECR (replace with your repository URI)
docker tag fragments:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/fragments:latest
```

### Step 8.3: Push to ECR

```powershell
# Push to ECR
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/fragments:latest
```

**Verify in AWS Console:**

1. Go to ECR → Repositories → fragments
2. You should see your image listed!

---

## 9. Create ECS Cluster {#create-ecs-cluster}

ECS runs your Docker containers on AWS.

### Step 9.1: Create Cluster

1. Open [AWS Console](https://console.aws.amazon.com/) → ECS
2. Click "Clusters" → "Create cluster"
3. Name your cluster: `fragments-cluster`
4. **Infrastructure**: Select "AWS Fargate"
5. Click "Create"

Wait for creation (1-2 minutes).

---

## 10. Deploy to ECS {#deploy-to-ecs}

### Step 10.1: Create Task Definition

1. Go to ECS → "Task definitions" → "Create new task definition"
2. Fill in:
   - **Task definition family**: `fragments`
   - **Launch type**: "AWS Fargate"
   - **OS / Architecture**: Linux / x86_64
   - **Task size**:
     - CPU: 256 (.25 vCPU)
     - Memory: 512 MB
   - **Task execution role**: `ecsTaskExecutionRole` (created earlier)
   - **Task role**: `ecsTaskRole` (created earlier)

3. Under **Container - 1**:
   - **Image URI**: `123456789012.dkr.ecr.us-east-1.amazonaws.com/fragments:latest`
   - **Port mappings**: `8080:8080` (TCP)

4. **Essential container**: Keep checked

5. Under **Environment variables**, add:
   - `NODE_ENV` = `production`
   - `AWS_REGION` = `us-east-1`
   - `AWS_COGNITO_POOL_ID` = your Cognito User Pool ID
   - `AWS_COGNITO_CLIENT_ID` = your Cognito Client ID
   - `AWS_S3_BUCKET_NAME` = `fragments-data-YOURUSERNAME`
   - `AWS_DYNAMODB_TABLE_NAME` = `fragments`

6. Click "Create"

### Step 10.2: Create Service

1. Go to your **fragments-cluster**
2. Click **"Services"** tab → **"Create"**
3. Fill in:
   - **Launch type**: "FARGATE"
   - **Task definition**: "fragments"
   - **Service name**: `fragments-service`
   - **Desired count**: 1 (for now)
4. Click "Next"

### Step 10.3: Configure Network

1. **VPC**: Select default VPC
2. **Subnets**: Select at least 2
3. **Security groups**: Create new or use default
   - Allow inbound traffic on port 8080
4. **Load balancer type**: "Application Load Balancer"
5. **Create new load balancer**: Yes
   - **Load balancer name**: `fragments-alb`
6. Click "Next"

### Step 10.4: Configure Load Balancer

1. **Target group protocol**: HTTP
2. **Target group port**: 8080
3. Create new target group: `fragments-tg`
4. **Health check path**: `/health` (or `/api/health` if your app has this)
5. Click "Next" → "Create service"

Wait for service to start (3-5 minutes).

### Step 10.5: Get Load Balancer URL

1. Go to **EC2** → **Load Balancers**
2. Find `fragments-alb`
3. Copy the **DNS name** (looks like: `fragments-alb-123456.us-east-1.elb.amazonaws.com`)
4. **Save this URL - it's your API endpoint!**

### Step 10.6: Test Your API

```powershell
# Test your running API
curl -X GET http://fragments-alb-123456.us-east-1.elb.amazonaws.com/health \
  -H "Authorization: Basic YWRtaW46cGFzc3dvcmQ="
```

If you see a response, your backend is running! 🎉

---

## 11. Configure Frontend {#configure-frontend}

Now point your React frontend to your AWS API.

### Step 11.1: Update Frontend Environment

Go to `fragment_frontend_30` directory and create `.env` file:

```
REACT_APP_API_URL=http://fragments-alb-123456.us-east-1.elb.amazonaws.com
REACT_APP_COGNITO_DOMAIN=fragments-users-REGION.auth.REGION.amazoncognito.com
REACT_APP_COGNITO_CLIENT_ID=YOUR_CLIENT_ID
REACT_APP_COGNITO_REDIRECT_URI=http://localhost:3000
```

Replace with your actual values!

### Step 11.2: Update api.js

Open `src/api.js` and update the base URL:

```javascript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
```

### Step 11.3: Run Frontend Locally

```powershell
cd fragment_frontend_30
npm install
npm start
```

---

## 12. Testing {#testing}

### Step 12.1: Test API Endpoints

**Create a fragment:**

```powershell
$headers = @{
    "Authorization" = "Basic YWRtaW46cGFzc3dvcmQ="
    "Content-Type" = "text/plain"
}

$response = Invoke-WebRequest -Uri "http://fragments-alb-123456.us-east-1.elb.amazonaws.com/v1/fragments" `
    -Method POST `
    -Headers $headers `
    -Body "Hello, AWS!"

$response.Content | ConvertFrom-Json
```

**List fragments:**

```powershell
$headers = @{
    "Authorization" = "Basic YWRtaW46cGFzc3dvcmQ="
}

Invoke-WebRequest -Uri "http://fragments-alb-123456.us-east-1.elb.amazonaws.com/v1/fragments" `
    -Method GET `
    -Headers $headers | Select-Object Content
```

### Step 12.2: Check CloudWatch Logs

1. Go to **CloudWatch** → **Log groups**
2. Find `/ecs/fragments`
3. Click to view your API logs

### Step 12.3: Verify DynamoDB Data

1. Go to **DynamoDB** → **Tables** → **fragments**
2. Click **"Explore table items"**
3. You should see your fragments stored here!

### Step 12.4: Verify S3 Data

1. Go to **S3** → `fragments-data-YOURUSERNAME`
2. You should see your fragment files stored here!

---

## Troubleshooting

### Task is failing to start

- Check **ECS** → **Tasks** → Click your task → View logs
- Check **CloudWatch** logs for error messages
- Verify environment variables are correct

### Can't connect to API

- Verify Load Balancer is in "Active" state
- Check Security Group allows inbound traffic on port 8080
- Check Target Group health check passes

### DynamoDB/S3 Permission Denied

- Verify IAM task role has correct permissions
- Check bucket/table names in environment variables match actual names
- Verify AWS_REGION environment variable is correct

### Docker Build Fails

- Make sure `.env` file exists or `.env.example` is present
- Check all dependencies in `package.json` are compatible
- Try: `docker build --no-cache -t fragments:latest .`

---

## Cost Management

**Free tier includes:**

- DynamoDB: 25 GB storage, 25 R/W capacity units
- S3: 5 GB storage
- ECR: 500 MB public/private
- ECS: Free (you pay for compute)
- ALB: ~$16/month
- Cognito: 50,000 MAU free

**To save money:**

- Stop tasks when not using (ECS → Services → Update desired count to 0)
- Monitor CloudWatch for unexpected usage
- Use smaller container sizes (256 CPU, 512 MB RAM minimum)

---

## Summary of Deployed Architecture

```
                              ┌─────────────────┐
                              │   Frontend      │
                              │  (localhost:3000)│
                              └────────┬─────────┘
                                       │
                              ┌────────▼────────┐
                              │  AWS ALB        │
                              │  (Load Balancer)│
                              └────────┬────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
            ┌───────▼──────┐  ┌───────▼──────┐  ┌───────▼──────┐
            │  ECS Task 1  │  │  ECS Task 2  │  │  ECS Task 3  │
            │ (Docker)     │  │ (Docker)     │  │ (Docker)     │
            └───────┬──────┘  └───────┬──────┘  └───────┬──────┘
                    │                  │                  │
        ┌───────────┴──────────────────┼──────────────────┘
        │                              │
    ┌───▼──────────┐          ┌───────▼──────────┐
    │  DynamoDB    │          │   S3 Bucket      │
    │ (Metadata)   │          │   (Fragment Data)│
    └──────────────┘          └──────────────────┘

        Cognito User Pool (Authentication)
```

---

## Next Steps

1. Deploy backend to ECS
2. Test API endpoints
3. Run frontend locally against AWS backend
4. Record video walkthrough
5. Create submission document

Congratulations! Your application is now running on AWS! 🚀
