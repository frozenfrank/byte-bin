# Database Design Diagram

This diagram illustrates the structure of our Firestore database, modeling the relationships between `Project`, `Task`, and `Config` entities. Unlike traditional relational databases, Firestore leverages embedded documents for optimized read performance.

- **Projects** serve as the primary entities, containing an embedded list of **Tasks** instead of using a separate collection.
- **RpProjectData** is embedded within each **Project**, capturing additional metadata from external systems.
- **Tasks** store key details such as job assignments, completion status, and predefined template references.
- **Config** holds structured configuration settings for the system, including `ClientConfig`, `SharedConfig`, and `ServerConfig`.

See the [sample database data](./entity-design-sample-data.json) to see how this data lives in the database.

## Diagram

The diagram below visually represents these relationships and data structures:


```mermaid
---
title: Nicolson PCO Database ERD with Embedded Data
---
erDiagram

PROJECT {
    string id PK "Project ID"
    boolean active "Is the project active?"
    string name "Project Name"
    date created_at "Creation Timestamp"
    date last_updated_at "Last Updated Timestamp (Optional)"
    date last_imported_at "Last Imported Timestamp (Optional)"
    date start_date "Start Date"
    date due_date "Due Date (Optional)"
    RpProjectData rp "Embedded Resource Planning Data (Optional)"
    Map~TaskId, TaskData~ tasks "Embedded List of Tasks"
}

RPProjectData {
    string project_id PK "RP Project ID"
    string status "Status (active, pending, inactive)"
    date updated_at "Last Updated Timestamp"
    date start_date "Start Date"
    date due_date "Due Date (Optional)"
    string[] group_ids "Associated Group IDs"
    string color "Hex Color Code"
    RPProjectCategory[] categories "Project Categories"
    RPProjectRole[] roles "Project Roles"
}

TASK {
    string id PK "Task ID"
    string name "Task Name"
    string job_title_id "Associated Job Title ID (Optional)"
    string rp_request_id "Associated RP Request ID (Optional)"
    int percent_complete "Completion Percentage (Optional)"
    date start_date "Task Start Date"
    int num_employees "Assigned Employees Count (Optional)"
    int square_feet "Square Feet to Work On (Optional)"
    int sqft_man_day "Work Output Per Day (Optional)"
    string predefined_task_id "Template Task ID (Optional)"
    string predefined_task_group_id "Template Task Group ID (Optional)"
    string predefined_task_material_id "Template Task Material ID (Optional)"
    string predefined_task_job_id "Template Task Job ID (Optional)"
    date created_at "Creation Timestamp"
    date date_completed "Completion Date (Optional)"
}

CONFIG {
    ClientConfig client "Client Configuration"
    SharedConfig shared "Shared Configuration"
    ServerConfig server "Server Configuration"
}

ClientConfig {
    string defaultJobTitleId
    boolean hideSalariedJobTitles
    string[] hideJobTitles
}

SharedConfig {
    PredefinedTaskConfig predefinedTasks
}

ServerConfig {
    Date rpLastRefresh
    number rpRefreshBackoffMinutes
}

PROJECT ||--o| RPProjectData : "has"
PROJECT ||--o{ TASK : "contains"
CONFIG ||--o{ ClientConfig : "includes"
CONFIG ||--o{ SharedConfig : "includes"
CONFIG ||--o{ ServerConfig : "includes"
```
