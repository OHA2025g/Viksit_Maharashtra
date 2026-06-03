import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { SectionCard } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/contexts/I18nContext";
import { toast } from "sonner";

function buildThread(comments) {
  const roots = comments.filter((c) => !c.parent_id);
  const byParent = {};
  comments.forEach((c) => {
    if (c.parent_id) {
      if (!byParent[c.parent_id]) byParent[c.parent_id] = [];
      byParent[c.parent_id].push(c);
    }
  });
  return roots.map((r) => ({ ...r, replies: byParent[r.id] || [] }));
}

export default function EntityCollaborationPanel({ entityType, entityId, entityLabel, author = "User" }) {
  const { t } = useI18n();
  const [comments, setComments] = useState([]);
  const [audit, setAudit] = useState([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState(null);

  const reloadComments = () =>
    api.get("/comments", { params: { entity_type: entityType, entity_id: entityId } })
      .then(({ data }) => setComments(data || []))
      .catch(() => setComments([]));

  useEffect(() => {
    if (!entityId) return;
    reloadComments();
    api.get(`/audit/${entityType}/${entityId}`)
      .then(({ data }) => setAudit(data || []))
      .catch(() => setAudit([]));
  }, [entityType, entityId]);

  const postComment = async () => {
    if (!text.trim()) return;
    try {
      await api.post("/comments", {
        entity_type: entityType,
        entity_id: entityId,
        author,
        body: text,
        parent_id: replyTo?.id || null,
      });
      setText("");
      setReplyTo(null);
      await reloadComments();
      toast.success("Comment added");
    } catch {
      toast.error("Could not post comment");
    }
  };

  if (!entityId) return null;

  const threads = buildThread(comments);

  return (
    <div className="grid lg:grid-cols-2 gap-4 mt-4">
      <SectionCard title={`${t("discussion.title")} — ${entityLabel || entityType}`}>
        <div className="space-y-3 max-h-52 overflow-y-auto mb-3" role="list" aria-label="Comment thread">
          {threads.map((c) => (
            <div key={c.id} role="listitem" className="text-xs border-b pb-2">
              <div className="font-semibold">{c.author} · {c.created_at?.slice(0, 16)}</div>
              <div>{c.body || c.text}</div>
              <button
                type="button"
                className="text-orange-600 hover:underline mt-1 text-[10px] font-semibold"
                onClick={() => { setReplyTo(c); setText(""); }}
              >
                {t("form.reply")}
              </button>
              {c.replies.map((r) => (
                <div key={r.id} className="ml-4 mt-2 pl-2 border-l-2 border-slate-200">
                  <div className="font-semibold">{r.author} · {r.created_at?.slice(0, 16)}</div>
                  <div>{r.body}</div>
                </div>
              ))}
            </div>
          ))}
          {threads.length === 0 && <p className="text-xs text-slate-500">{t("comment.noComments")}</p>}
        </div>
        {replyTo && (
          <p className="text-[10px] text-orange-700 mb-2">
            {t("comment.replyTo")}: {replyTo.author}
            <button type="button" className="ml-2 underline" onClick={() => setReplyTo(null)}>{t("form.cancel")}</button>
          </p>
        )}
        <div className="flex gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("comment.add")}
            className="text-xs"
            aria-label={t("comment.add")}
            onKeyDown={(e) => e.key === "Enter" && postComment()}
          />
          <Button size="sm" onClick={postComment} aria-label={t("form.post")}>{t("form.post")}</Button>
        </div>
      </SectionCard>
      <SectionCard titleKey="audit.title">
        <div className="space-y-2 max-h-48 overflow-y-auto text-xs" role="log" aria-label={t("audit.title")} aria-live="polite">
          {audit.map((a) => (
            <div key={a.id || `${a.changed_at}-${a.field}`} className="border-b pb-1">
              <div className="font-semibold">{a.change_type || "update"} · {a.changed_by}</div>
              <div className="text-slate-500">{a.field}: {String(a.old_value ?? "—")} → {String(a.new_value ?? "—")}</div>
              <div className="text-[10px] text-slate-400">{a.changed_at?.slice(0, 19)}</div>
            </div>
          ))}
          {audit.length === 0 && <p className="text-slate-500">{t("audit.empty")}</p>}
        </div>
      </SectionCard>
    </div>
  );
}
