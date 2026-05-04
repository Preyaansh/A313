pipeline {
  agent any

  environment {
    APP_NAME = 'A313'
    COMPOSE_PROJECT_NAME = 'a313'
    NODE_IMAGE = 'node:24-alpine'
  }

  options {
    buildDiscarder(logRotator(numToKeepStr: '10'))
    timestamps()
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
        script {
          currentBuild.displayName = "A313 #${env.BUILD_NUMBER}"
        }
      }
    }

    stage('Install') {
      steps {
        script {
          runNodeCommand('npm ci')
        }
      }
    }

    stage('Check') {
      steps {
        script {
          runNodeCommand('npm run check')
        }
      }
    }

    stage('Build') {
      steps {
        script {
          runNodeCommand('npm run build')
        }
      }
      post {
        success {
          archiveArtifacts artifacts: 'dist/**', fingerprint: true
        }
      }
    }

    stage('Docker Build') {
      steps {
        script {
          runCommand('docker build -t a313:latest .')
        }
      }
    }

    stage('Deploy') {
      when {
        branch 'main'
      }
      steps {
        script {
          runCommand('docker compose up -d --build || docker-compose up -d --build')
        }
      }
    }
  }

  post {
    success {
      echo 'A313 CI/CD pipeline completed successfully.'
    }
    failure {
      echo 'A313 CI/CD pipeline failed. Check the Jenkins console output.'
    }
  }
}

void runCommand(String command) {
  if (isUnix()) {
    sh command
  } else {
    bat command
  }
}

void runNodeCommand(String command) {
  if (isUnix()) {
    sh "docker run --rm -v \"${pwd()}:/workspace\" -w /workspace ${env.NODE_IMAGE} sh -lc '${command}'"
  } else {
    bat "docker run --rm -v \"%cd%:/workspace\" -w /workspace ${env.NODE_IMAGE} sh -lc \"${command}\""
  }
}
