-- newpoint-marketing: no ops.crisis-* task may ever appear in metrics.agent_health (§4).
-- The original CHECK refuses only ops.crisis-page; ops.crisis-dead-man's failure date could
-- date a missed crisis acknowledgment just as well. The PHI-side writer already skips them;
-- this makes the database refuse them too.
alter table metrics.agent_health add constraint agent_health_no_crisis_tasks check (task_id !~ '^ops\.crisis');
