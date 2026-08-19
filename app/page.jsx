"use client";

import { useState } from "react";
import AppShell from "@/components/AppShell";
import OnboardingModal from "@/components/OnboardingModal";
import { money, timeAgo } from "@/lib/format";
import { clientName, proposalTotals, useData } from "@/lib/store";

export default function Dashboard() {
  const data = useData();
  const [onboardDismissed, setOnboardDismissed] = useState(false);
  if (!data) return <AppShell title="Dashboard" />;

  const currency = data.settings.proposalDefaults.currency;
  const activeProjects = data.projects.filter(
    (p) => !["Completed", "Archived"].includes(p.status),
  );
  const drafts = data.proposals.filter((p) => p.status === "Draft");
  const sent = data.proposals.filter((p) => ["Sent", "Viewed"].includes(p.status));
  const accepted = data.proposals.filter((p) => p.status === "Accepted");
  const totalValue = data.proposals.reduce(
    (sum, p) => sum + proposalTotals(p, data.settings).total,
    0,
  );
  const pendingRevenue = sent.reduce(
    (sum, p) => sum + proposalTotals(p, data.settings).total,
    0,
  );
  const steps = [
    {
      num: 1,
      title: "Add a client",
      done: data.clients.length > 0,
      doneText: `${data.clients.length} client(s)`,
      todoText: "Keep contacts in one place",
      href: "/clients?new=1",
      label: "Add client",
    },
    {
      num: 2,
      title: "Create a project",
      done: data.projects.length > 0,
      doneText: `${data.projects.length} project(s)`,
      todoText: "One workspace per wall",
      href: "/projects?new=1",
      label: "New project",
    },
    {
      num: 3,
      title: "Make a mockup",
      done: data.mockups.length > 0,
      doneText: `${data.mockups.length} mockup(s)`,
      todoText: "See it on the real wall",
      href: "/studio",
      label: "Open studio",
    },
    {
      num: 4,
      title: "Send a proposal",
      done: data.proposals.length > 0,
      doneText: `${data.proposals.length} proposal(s)`,
      todoText: "Scope, pricing, signature",
      href: "/proposals?new=1",
      label: "New proposal",
    },
  ];
  const nextIndex = steps.findIndex((s) => !s.done);

  return (
    <AppShell title="Dashboard" subtitle="Your mural business at a glance">
      {data.billing && !data.billing.onboarded && !onboardDismissed ? (
        <OnboardingModal onClose={() => setOnboardDismissed(true)} />
      ) : null}
      <div className="flow">
        {steps.map((step, i) => {
          const isNext = i === nextIndex;
          const cls = step.done ? "flow-step done" : isNext ? "flow-step next" : "flow-step";
          return (
            <div className={cls} key={step.num}>
              <span className="num">{step.done ? "✓" : step.num}</span>
              <b>{step.title}</b>
              <span>{step.done ? step.doneText : step.todoText}</span>
              <a className={isNext ? "btn primary" : "btn ghost mini"} href={step.href}>
                {step.label}
              </a>
            </div>
          );
        })}
      </div>

      <div className="stat-grid">
        <div className="stat">
          <div className="label">Active Projects</div>
          <div className="value">{activeProjects.length}</div>
          <div className="sub">{data.projects.length} total</div>
        </div>
        <div className="stat">
          <div className="label">Proposals</div>
          <div className="value">{data.proposals.length}</div>
          <div className="sub">
            {drafts.length} draft · {sent.length} sent · {accepted.length} accepted
          </div>
        </div>
        <div className="stat">
          <div className="label">Total Proposal Value</div>
          <div className="value">{money(totalValue, currency)}</div>
          <div className="sub">across all proposals</div>
        </div>
        <div className="stat">
          <div className="label">Pending Revenue</div>
          <div className="value">{money(pendingRevenue, currency)}</div>
          <div className="sub">awaiting client decision</div>
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <h3>Recent Activity</h3>
          {data.activity.length ? (
            <div className="activity">
              {data.activity.slice(0, 10).map((item) => (
                <div className="activity-item" key={item.id}>
                  <span className="activity-dot" />
                  <span>{item.text}</span>
                  <span className="when">{timeAgo(item.at)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "var(--mute)" }}>
              Activity will appear here as you add clients, mockups, and proposals.
            </p>
          )}
        </div>

        <div className="card">
          <h3>Recent Clients</h3>
          {data.clients.length ? (
            <div className="activity">
              {data.clients.slice(0, 6).map((client) => (
                <div className="activity-item" key={client.id}>
                  <a href={`/clients/${client.id}`}>{client.company || client.contact}</a>
                  <span className="when">
                    {
                      data.proposals.filter((p) => p.clientId === client.id).length
                    }{" "}
                    proposals
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty" style={{ padding: 24 }}>
              <b>No clients yet</b>
              <p>You haven&apos;t added any clients yet.</p>
              <a className="btn ghost" href="/clients?new=1">Add Your First Client</a>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
