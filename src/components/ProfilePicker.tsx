"use client";

import { AVATARS, COLORS } from "@/lib/constants";
import Avatar from "./Avatar";

export type Profile = { name: string; avatar: string; color: string };

export default function ProfilePicker({
  value,
  onChange,
  lockName = false,
}: {
  value: Profile;
  onChange: (p: Profile) => void;
  /** Имя задано профилем и не редактируется — выбираются только аватар и цвет. */
  lockName?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Avatar avatar={value.avatar} color={value.color} size={52} />
        {lockName ? (
          <div className="min-w-0 flex-1 truncate text-lg font-semibold">{value.name}</div>
        ) : (
          <input
            className="input flex-1"
            placeholder="Ваше имя"
            maxLength={40}
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
          />
        )}
      </div>
      <div>
        <div className="mb-1 text-xs font-medium text-slate-500">Аватар</div>
        <div className="flex flex-wrap gap-1.5">
          {AVATARS.map((a) => (
            <button
              type="button"
              key={a}
              onClick={() => onChange({ ...value, avatar: a })}
              className={`flex h-9 w-9 items-center justify-center rounded-lg text-xl transition ${
                value.avatar === a ? "bg-red-100 ring-2 ring-red-500" : "bg-slate-100 hover:bg-slate-200"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-1 text-xs font-medium text-slate-500">Цвет</div>
        <div className="flex flex-wrap gap-1.5">
          {COLORS.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => onChange({ ...value, color: c })}
              className={`h-7 w-7 rounded-full transition ${
                value.color === c ? "ring-2 ring-slate-900 ring-offset-2" : ""
              }`}
              style={{ background: c }}
              aria-label={c}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
