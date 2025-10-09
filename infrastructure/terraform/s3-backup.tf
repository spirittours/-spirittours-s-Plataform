terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  description = "AWS region for resources"
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  default     = "production"
}

# S3 Bucket for Backups
resource "aws_s3_bucket" "spirit_tours_backups" {
  bucket = "spirit-tours-backups-${var.environment}"

  tags = {
    Name        = "Spirit Tours Backups"
    Environment = var.environment
    Purpose     = "Database and Application Backups"
    ManagedBy   = "Terraform"
  }
}

# Enable versioning for backup files
resource "aws_s3_bucket_versioning" "backup_versioning" {
  bucket = aws_s3_bucket.spirit_tours_backups.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Enable encryption for backups
resource "aws_s3_bucket_server_side_encryption_configuration" "backup_encryption" {
  bucket = aws_s3_bucket.spirit_tours_backups.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.backup_key.arn
    }
    bucket_key_enabled = true
  }
}

# Lifecycle policy for backup retention
resource "aws_s3_bucket_lifecycle_configuration" "backup_lifecycle" {
  bucket = aws_s3_bucket.spirit_tours_backups.id

  rule {
    id     = "backup-retention-policy"
    status = "Enabled"

    # Move to Infrequent Access after 30 days
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    # Move to Glacier after 90 days
    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    # Move to Deep Archive after 180 days
    transition {
      days          = 180
      storage_class = "DEEP_ARCHIVE"
    }

    # Delete backups older than 365 days
    expiration {
      days = 365
    }

    # Clean up incomplete multipart uploads
    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }

  rule {
    id     = "daily-backup-retention"
    status = "Enabled"

    filter {
      prefix = "daily/"
    }

    # Keep daily backups for 7 days
    expiration {
      days = 7
    }
  }

  rule {
    id     = "weekly-backup-retention"
    status = "Enabled"

    filter {
      prefix = "weekly/"
    }

    # Keep weekly backups for 30 days
    expiration {
      days = 30
    }
  }

  rule {
    id     = "monthly-backup-retention"
    status = "Enabled"

    filter {
      prefix = "monthly/"
    }

    # Keep monthly backups for 365 days
    expiration {
      days = 365
    }
  }
}

# Enable point-in-time recovery
resource "aws_s3_bucket_replication_configuration" "backup_replication" {
  role   = aws_iam_role.replication_role.arn
  bucket = aws_s3_bucket.spirit_tours_backups.id

  rule {
    id     = "backup-replication"
    status = "Enabled"

    filter {}

    delete_marker_replication {
      status = "Enabled"
    }

    destination {
      bucket        = aws_s3_bucket.spirit_tours_backups_replica.arn
      storage_class = "GLACIER_IR"

      replication_time {
        status = "Enabled"
        time {
          minutes = 15
        }
      }

      metrics {
        status = "Enabled"
        event_threshold {
          minutes = 15
        }
      }
    }
  }
}

# Backup bucket in different region for disaster recovery
resource "aws_s3_bucket" "spirit_tours_backups_replica" {
  provider = aws.replica
  bucket   = "spirit-tours-backups-replica-${var.environment}"

  tags = {
    Name        = "Spirit Tours Backups Replica"
    Environment = var.environment
    Purpose     = "Disaster Recovery Backups"
    ManagedBy   = "Terraform"
  }
}

# KMS key for backup encryption
resource "aws_kms_key" "backup_key" {
  description             = "KMS key for Spirit Tours backup encryption"
  deletion_window_in_days = 10
  enable_key_rotation     = true

  tags = {
    Name        = "spirit-tours-backup-key"
    Environment = var.environment
  }
}

resource "aws_kms_alias" "backup_key_alias" {
  name          = "alias/spirit-tours-backups"
  target_key_id = aws_kms_key.backup_key.key_id
}

# IAM role for S3 replication
resource "aws_iam_role" "replication_role" {
  name = "spirit-tours-s3-replication-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
      }
    ]
  })
}

# IAM policy for S3 replication
resource "aws_iam_role_policy" "replication_policy" {
  role = aws_iam_role.replication_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetReplicationConfiguration",
          "s3:ListBucket"
        ]
        Resource = aws_s3_bucket.spirit_tours_backups.arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObjectVersionForReplication",
          "s3:GetObjectVersionAcl",
          "s3:GetObjectVersionTagging"
        ]
        Resource = "${aws_s3_bucket.spirit_tours_backups.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ReplicateObject",
          "s3:ReplicateDelete",
          "s3:ReplicateTags"
        ]
        Resource = "${aws_s3_bucket.spirit_tours_backups_replica.arn}/*"
      }
    ]
  })
}

# IAM user for backup operations
resource "aws_iam_user" "backup_user" {
  name = "spirit-tours-backup-user"

  tags = {
    Name        = "Spirit Tours Backup User"
    Environment = var.environment
  }
}

# IAM policy for backup user
resource "aws_iam_user_policy" "backup_user_policy" {
  name = "spirit-tours-backup-policy"
  user = aws_iam_user.backup_user.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket",
          "s3:GetBucketLocation",
          "s3:ListBucketMultipartUploads"
        ]
        Resource = aws_s3_bucket.spirit_tours_backups.arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:AbortMultipartUpload",
          "s3:ListMultipartUploadParts"
        ]
        Resource = "${aws_s3_bucket.spirit_tours_backups.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:Encrypt",
          "kms:GenerateDataKey"
        ]
        Resource = aws_kms_key.backup_key.arn
      }
    ]
  })
}

# Access key for backup user
resource "aws_iam_access_key" "backup_user_key" {
  user = aws_iam_user.backup_user.name
}

# CloudWatch alarms for backup monitoring
resource "aws_cloudwatch_metric_alarm" "backup_failure" {
  alarm_name          = "spirit-tours-backup-failure"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "BackupFailures"
  namespace           = "SpiritTours/Backups"
  period              = "3600"
  statistic           = "Sum"
  threshold           = "0"
  alarm_description   = "This metric monitors backup failures"
  alarm_actions       = [aws_sns_topic.alerts.arn]
}

# SNS topic for alerts
resource "aws_sns_topic" "alerts" {
  name = "spirit-tours-backup-alerts"

  tags = {
    Name        = "Spirit Tours Backup Alerts"
    Environment = var.environment
  }
}

# Output values
output "backup_bucket_name" {
  value = aws_s3_bucket.spirit_tours_backups.id
}

output "backup_bucket_arn" {
  value = aws_s3_bucket.spirit_tours_backups.arn
}

output "backup_user_access_key" {
  value     = aws_iam_access_key.backup_user_key.id
  sensitive = true
}

output "backup_user_secret_key" {
  value     = aws_iam_access_key.backup_user_key.secret
  sensitive = true
}

output "kms_key_id" {
  value = aws_kms_key.backup_key.id
}