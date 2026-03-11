-- Baseline RLS enforcement for all application tables.
-- This migration should be applied once against a fresh or existing database
-- to ensure every table has Row Level Security enabled.
--
-- Default posture: RLS enabled, no allow policies = service-role only.
-- Tables that need client-side access should get explicit authenticated policies
-- added in subsequent migrations.

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE models ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_model_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE allowed_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_enhancement_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_chat_messages ENABLE ROW LEVEL SECURITY;
