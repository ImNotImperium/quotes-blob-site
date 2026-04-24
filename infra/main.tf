terraform {
  required_version = ">= 1.6.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.120"
    }
  }
}

provider "azurerm" {
  features {}
}

variable "resource_group_name" {
  type    = string
  default = "rg-cloud-file-converter"
}

variable "location" {
  type    = string
  default = "francecentral"
}

variable "function_app_name" {
  type = string
}

variable "storage_account_name" {
  type = string
}

resource "azurerm_resource_group" "rg" {
  name     = var.resource_group_name
  location = var.location
}

resource "azurerm_storage_account" "storage" {
  name                     = var.storage_account_name
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"

  static_website {
    index_document = "index.html"
  }
}

resource "azurerm_storage_management_policy" "policy" {
  storage_account_id = azurerm_storage_account.storage.id

  rule {
    name    = "delete-old-originals"
    enabled = true

    filters {
      blob_types   = ["blockBlob"]
      prefix_match = ["original/"]
    }

    actions {
      base_blob {
        delete_after_days_since_modification_greater_than = 30
      }
    }
  }
}

resource "azurerm_service_plan" "plan" {
  name                = "asp-file-converter"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  os_type             = "Linux"
  sku_name            = "Y1"
}

resource "azurerm_linux_function_app" "api" {
  name                       = var.function_app_name
  location                   = azurerm_resource_group.rg.location
  resource_group_name        = azurerm_resource_group.rg.name
  service_plan_id            = azurerm_service_plan.plan.id
  storage_account_name       = azurerm_storage_account.storage.name
  storage_account_access_key = azurerm_storage_account.storage.primary_access_key

  site_config {
    application_stack {
      node_version = "20"
    }
  }

  app_settings = {
    FUNCTIONS_WORKER_RUNTIME = "node"
    ORIGINAL_CONTAINER       = "original"
    CONVERTED_CONTAINER      = "converted"
    STATUS_CONTAINER         = "status"
    CONVERSION_QUEUE_NAME    = "conversion-jobs"
    USE_ASYNC_PROCESSING     = "true"
  }
}

output "function_url" {
  value = azurerm_linux_function_app.api.default_hostname
}

output "static_website_url" {
  value = azurerm_storage_account.storage.primary_web_endpoint
}
