import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, SectionCard } from "@/components/PageHeader";
import { DataTable, THead, Th, Td } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";

export default function Settings() {
  const [tab, setTab] = useState("pillars");
  const [pillars, setPillars] = useState([]);
  const [themes, setThemes] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    api.get("/pillars").then(({ data }) => setPillars(data));
    api.get("/themes").then(({ data }) => setThemes(data));
    api.get("/departments").then(({ data }) => setDepartments(data));
    api.get("/districts").then(({ data }) => setDistricts(data));
    api.get("/auth/users").then(({ data }) => setUsers(data));
  }, []);

  const reseed = async () => {
    if (!window.confirm("Reseed will wipe all data and replace with fresh sample data. Continue?")) return;
    try {
      await api.post("/admin/reseed");
      toast.success("Database reseeded with fresh sample data");
      window.location.reload();
    } catch (e) {
      toast.error("Reseed failed");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrowKey="page.settings.eyebrow"
        titleKey="page.settings.title"
        subtitleKey="page.settings.subtitle"
        actions={
          <Button onClick={reseed} variant="outline" data-testid="reseed-btn">Reseed Sample Data</Button>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pillars" data-testid="tab-pillars">Pillars</TabsTrigger>
          <TabsTrigger value="themes" data-testid="tab-themes">Themes</TabsTrigger>
          <TabsTrigger value="departments" data-testid="tab-departments">Departments</TabsTrigger>
          <TabsTrigger value="districts" data-testid="tab-districts">Districts</TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">Users & Roles</TabsTrigger>
        </TabsList>

        <TabsContent value="pillars">
          <SectionCard>
            <Table captionKey="table.caption.settingsPillars" headers={["Code", "Name", "Description"]} rows={pillars.map((p) => [p.code, p.name, p.description])} />
          </SectionCard>
        </TabsContent>
        <TabsContent value="themes">
          <SectionCard>
            <Table captionKey="table.caption.settingsThemes" headers={["Code", "Name", "Pillar", "Objective"]} rows={themes.map((t) => [t.code, t.name, pillars.find((p) => p.id === t.pillar_id)?.name || "—", t.objective])} />
          </SectionCard>
        </TabsContent>
        <TabsContent value="departments">
          <SectionCard>
            <Table captionKey="table.caption.settingsDepartments" headers={["Name", "Head", "Email"]} rows={departments.map((d) => [d.name, d.head, d.email])} />
          </SectionCard>
        </TabsContent>
        <TabsContent value="districts">
          <SectionCard>
            <Table captionKey="table.caption.settingsDistricts" headers={["District", "Region", "Progress %"]} rows={districts.map((d) => [d.name, d.region, `${d.progress_score}%`])} />
          </SectionCard>
        </TabsContent>
        <TabsContent value="users">
          <SectionCard>
            <Table captionKey="table.caption.settingsUsers" headers={["Name", "Email", "Role"]} rows={users.map((u) => [u.name, u.email, u.role])} />
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Table({ headers, rows, captionKey }) {
  return (
    <DataTable captionKey={captionKey}>
      <THead>
        <tr>{headers.map((h) => <Th key={h}>{h}</Th>)}</tr>
      </THead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
            {r.map((c, j) => <Td key={j}>{c}</Td>)}
          </tr>
        ))}
      </tbody>
    </DataTable>
  );
}
