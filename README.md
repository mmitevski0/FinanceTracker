# Personal Finance Tracker

A robust and scalable personal finance tracking application built with a React frontend, FastAPI backend, and PostgreSQL database, deployed on Kubernetes using `k3d`.

## Overview

This project provides a simple yet powerful tool to manage your personal finances. It allows users to track income and expenses, categorize transactions, and gain insights into their spending habits. The application is designed with a microservices architecture, making it highly scalable and maintainable.

## Setup Instructions

Follow these steps to get the Personal Finance Tracker running on your local machine using `k3d`.

### Prerequisites

Before you begin, ensure you have the following installed:

* **Git:** For cloning the repository.

* **Docker Desktop:** Essential for running `k3d` and building Docker images.

    * Ensure WSL 2 integration is enabled in Docker Desktop settings (if on Windows).

    * Ensure you are logged into Docker Hub in Docker Desktop.

* **kubectl:** The Kubernetes command-line tool.

    * [Install kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl/)

* **k3d:** A lightweight wrapper to run k3s (Rancher Lab's minimal Kubernetes distribution) in Docker.

    * [Install k3d](https://www.google.com/search?q=https://k3d.io/v5.4.6/%23installation) (e.g., `winget install k3d` on Windows, `brew install k3d` on macOS, or `wget -q -O - https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash` on Linux)

* **Node.js (v18 or higher) & npm:** For building the React frontend.

* **Python (v3.9 or higher) & pip:** For the FastAPI backend.

### 1. Clone the Repository

First, clone the project repository to your local machine:

```
git clone [https://github.com/mmitevski0/FinanceTracker.git](https://github.com/mmitevski0/FinanceTracker.git)
cd FinanceTracker
```

### 2. Set up Docker Hub Credentials (for CI/CD)

If you plan to use the CI/CD pipeline or push images manually, ensure your Docker Hub username is correctly configured and you have a Personal Access Token (PAT) set up as a GitHub Secret.

* Go to your GitHub repository settings.

* Navigate to `Secrets and variables` > `Actions` > `Repository secrets`.

* Add two new secrets:

    * `DOCKERHUB_USERNAME`: Your Docker Hub username.

    * `DOCKERHUB_TOKEN`: Your Docker Hub Personal Access Token.

### 3. Build and Push Docker Images

The GitHub Actions CI/CD pipeline will automatically build and push the images when you push changes to `main`. However, for the initial setup, or if you make local changes, you might need to build and push them manually.

Make sure you are in the root directory of your project (`FinanceTracker/`).

```
# Build and push Backend image
docker build -t your_dockerhub_username/financetracker-backend:latest -f backend/Dockerfile .
docker push your_dockerhub_username/financetracker-backend:latest

# Build and push Frontend image (with API_BASE_URL for Kubernetes)
docker build -t your_dockerhub_username/financetracker-frontend:latest -f frontend/Dockerfile . --build-arg REACT_APP_API_BASE_URL=/api
docker push your_dockerhub_username/financetracker-frontend:latest
```

**Replace `your_dockerhub_username` with your actual Docker Hub username.**

### 4. Create the k3d Cluster

This command will create a `k3d` cluster and map port 80 of the cluster's load balancer to port 80 on your host machine.

```
k3d cluster create finance-tracker-cluster --port 80:80@loadbalancer --agents 1
```

Verify the cluster is running:

```
kubectl cluster-info
kubectl get nodes
```

### 5. Install Nginx Ingress Controller

`k3d` comes with Traefik by default, but our Ingress manifests are for Nginx. Install the Nginx Ingress Controller:

```
kubectl apply -f [https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml](https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml)
```

Wait for the Nginx Ingress Controller pod to be running:

```
kubectl get pods -n ingress-nginx -w
```

### 6. Apply Kubernetes Manifests

Apply all the Kubernetes deployment, service, and ingress manifests. Ensure you replace `your_dockerhub_username` in `kubernetes/frontend-deployment.yaml` and `kubernetes/backend-deployment.yaml` with your actual Docker Hub username.

```
# Create namespace
kubectl apply -f kubernetes/namespace.yaml

# Apply PostgreSQL manifests
kubectl apply -f kubernetes/postgres-secret.yaml -n finance-tracker-ns
kubectl apply -f kubernetes/postgres-configmap.yaml -n finance-tracker-ns
kubectl apply -f kubernetes/postgres-service.yaml -n finance-tracker-ns
kubectl apply -f kubernetes/postgres-statefulset.yaml -n finance-tracker-ns

# Apply Backend manifests
kubectl apply -f kubernetes/backend-configmap.yaml -n finance-tracker-ns
kubectl apply -f kubernetes/backend-deployment.yaml -n finance-tracker-ns
kubectl apply -f kubernetes/backend-service.yaml -n finance-tracker-ns

# Apply Frontend manifests
kubectl apply -f kubernetes/frontend-deployment.yaml -n finance-tracker-ns
kubectl apply -f kubernetes/frontend-service.yaml -n finance-tracker-ns

# Apply Ingress manifests (separate for frontend and backend)
kubectl apply -f kubernetes/ingress-frontend.yaml -n finance-tracker-ns
kubectl apply -f kubernetes/ingress-backend.yaml -n finance-tracker-ns
```

Monitor the pods until all are `Running`:

```
kubectl get pods -n finance-tracker-ns -w
```

### 7. Update your `hosts` file

To access the application via `finance.local`, you need to map this domain to your localhost IP address.

* Open your `hosts` file with administrator privileges:

    * **Windows:** `C:\Windows\System32\drivers\etc\hosts`

    * **macOS/Linux:** `/etc/hosts`

* Add the following line:

    ```
    127.0.0.1       finance.local
    ```

* Save the file.

* Flush your DNS cache:

    * **Windows:** `ipconfig /flushdns`

    * **macOS:** `sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder`

    * **Linux:** `sudo systemctl restart NetworkManager` (or `sudo /etc/init.d/nscd restart`)

### 8. Access the Application

1.  **Close all instances of your web browser.**

2.  Open your browser in an **incognito/private window**.

3.  Navigate to: `http://finance.local`

You should now see the Personal Finance Tracker frontend. The frontend will communicate with the backend via `http://finance.local/api`.

### Stopping and Starting the Cluster

For quick stops and starts without losing data:

**To Stop the Cluster:**

```
k3d cluster stop finance-tracker-cluster
# You can also close Docker Desktop, which will stop the k3d containers.
```

**To Start the Cluster:**

```
# First, ensure Docker Desktop is running
k3d cluster start finance-tracker-cluster
# Wait for pods to become Ready:
kubectl get pods -n finance-tracker-ns -w
# Then, clear browser cache and hard reload for [http://finance.local](http://finance.local)
```

### Cleaning Up

To completely remove the `k3d` cluster and all its data:

```
k3d cluster delete finance-tracker-cluster