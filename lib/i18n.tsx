"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

export type Lang = "en" | "th" | "zh";

type Dict = Record<string, Record<Lang, string>>;

export const strings: Dict = {
  brandTag: { en: "Find your buddy", th: "หาเพื่อนไปด้วยกัน", zh: "找个伴，一起去" },
  tabEvents: { en: "Events", th: "กิจกรรม", zh: "活动" },
  tabProjects: { en: "Projects", th: "โปรเจกต์", zh: "项目" },
  signOut: { en: "Sign out", th: "ออกจากระบบ", zh: "退出" },
  pasteLink: { en: "paste a lu.ma event link", th: "วางลิงก์กิจกรรม lu.ma", zh: "粘贴 lu.ma 活动链接" },
  yourMission: { en: "your mission — why are you going?", th: "เป้าหมายของคุณ — ไปทำไม?", zh: "你的目的——为什么去参加？" },
  offerPlusOne: { en: "Offer plus one", th: "เสนอเพื่อนร่วมงาน", zh: "邀请同行者" },
  myEvents: { en: "My events", th: "กิจกรรมของฉัน", zh: "我的活动" },
  waiting: { en: "Waiting for a local to pick you…", th: "รอคนท้องถิ่นเลือกคุณ…", zh: "等待当地人选择你…" },
  matchedWith: { en: "Matched with", th: "จับคู่กับ", zh: "已与…配对" },
  cancelOffer: { en: "Cancel offer", th: "ยกเลิกข้อเสนอ", zh: "取消邀请" },
  cancelMatch: { en: "Cancel match", th: "ยกเลิกการจับคู่", zh: "取消配对" },
  cancel: { en: "Cancel", th: "ยกเลิก", zh: "取消" },
  myMatches: { en: "My matches", th: "การจับคู่ของฉัน", zh: "我的配对" },
  yourHost: { en: "Your host", th: "เจ้าภาพของคุณ", zh: "你的同伴" },
  eventsWithPlusOne: { en: "Events with a free plus one", th: "กิจกรรมที่มีเพื่อนร่วมงานฟรี", zh: "有免费同伴名额的活动" },
  nothingYet: { en: "Nothing yet — check back soon.", th: "ยังไม่มี — ไว้กลับมาดูใหม่", zh: "暂时没有——稍后回来查看" },
  pickThem: { en: "Pick them", th: "เลือกคนนี้", zh: "选TA" },
  whoFitsMe: { en: "Who fits me?", th: "ใครเหมาะกับฉัน?", zh: "谁适合我？" },
  missionForEvent: { en: "your mission for this event — why are you going?", th: "เป้าหมายของคุณสำหรับกิจกรรมนี้", zh: "你参加这个活动的目的" },
  tooSlow: { en: "Too slow — someone just took that one.", th: "ช้าไป — มีคนเพิ่งรับไปแล้ว", zh: "太慢了——刚被别人抢先了" },
  matchedNotice: { en: "Matched! Check above for their LINE id.", th: "จับคู่แล้ว! ดู LINE id ด้านบน", zh: "配对成功！查看上方的 LINE id" },
  askingAI: { en: "Asking who fits you best…", th: "กำลังหาคนที่เหมาะกับคุณ…", zh: "正在为你挑选最合适的人…" },
  pickedForYou: { en: "Picked for you", th: "เลือกให้คุณแล้ว", zh: "为你挑选" },
  reviewsLocked: { en: "Reviews unlock once the event starts.", th: "รีวิวจะเปิดเมื่องานเริ่ม", zh: "活动开始后才能评价" },
  leaveReview: { en: "Leave review", th: "ให้คะแนน", zh: "提交评价" },
  noShowBtn: { en: "They didn't show up", th: "เขาไม่มา", zh: "对方没有来" },
  noShowMark: { en: "(marked as no-show)", th: "(ไม่มาตามนัด)", zh: "（未到场）" },
  youGave: { en: "You gave", th: "คุณให้", zh: "你评了" },
  gaveYou: { en: "gave you", th: "ให้คุณ", zh: "评了你" },
  hasntReviewed: { en: "hasn't reviewed yet.", th: "ยังไม่ได้รีวิว", zh: "还未评价" },
  howWas: { en: "How was", th: "เป็นอย่างไรบ้าง", zh: "感觉如何" },
  projectsTitle: { en: "Free collaboration projects", th: "โปรเจกต์ร่วมมือ (ไม่มีค่าจ้าง)", zh: "免费协作项目" },
  projectsHint: {
    en: "No money, no job offers — people looking for others to build something together.",
    th: "ไม่มีค่าจ้าง ไม่มีตำแหน่งงาน — แค่อยากหาคนมาทำอะไรด้วยกัน",
    zh: "不涉及金钱和职位——只是找人一起做点什么",
  },
  newProject: { en: "Start a project", th: "เริ่มโปรเจกต์", zh: "发起项目" },
  projectTitlePh: { en: "project title", th: "ชื่อโปรเจกต์", zh: "项目标题" },
  projectDescPh: { en: "what are you building / doing?", th: "คุณกำลังทำอะไรอยู่?", zh: "你在做什么？" },
  lookingForPh: { en: "who are you looking for? (skills, vibe)", th: "ตามหาใครอยู่? (ทักษะ)", zh: "你在找什么样的人？（技能、风格）" },
  requestJoin: { en: "Request to join", th: "ขอเข้าร่วม", zh: "申请加入" },
  requestMissionPh: { en: "why you? what do you bring?", th: "ทำไมต้องเป็นคุณ? คุณมีอะไร?", zh: "为什么是你？你能带来什么？" },
  requested: { en: "Requested", th: "ขอแล้ว", zh: "已申请" },
  requests: { en: "Requests", th: "คำขอ", zh: "申请" },
  accept: { en: "Accept", th: "รับ", zh: "接受" },
  decline: { en: "Decline", th: "ปฏิเสธ", zh: "拒绝" },
  myProjects: { en: "My projects", th: "โปรเจกต์ของฉัน", zh: "我的项目" },
  joinedProjects: { en: "Joined", th: "เข้าร่วมแล้ว", zh: "已加入" },
  closeProject: { en: "Close", th: "ปิดโปรเจกต์", zh: "关闭项目" },
  teamLine: { en: "team LINE contacts", th: "LINE ของทีม", zh: "团队 LINE 联系方式" },
  catSocial: { en: "Social", th: "สังสรรค์", zh: "轻松认识" },
  catBuild: { en: "Build & learn", th: "สร้างและเรียนรู้", zh: "一起创造" },
  catLocalLife: { en: "Local life", th: "ชีวิตท้องถิ่น", zh: "本地生活" },
};

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: "en",
  setLang: () => {},
});

export function LangProvider({
  initial,
  userId,
  children,
}: {
  initial: Lang;
  userId: string | null;
  children: ReactNode;
}) {
  const [lang, setLangState] = useState<Lang>(initial);
  const supabase = createClient();

  function setLang(l: Lang) {
    setLangState(l);
    if (userId) supabase.from("profiles").update({ language: l }).eq("id", userId).then();
  }

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}

export function useT() {
  const { lang } = useLang();
  return (key: keyof typeof strings) => strings[key]?.[lang] ?? key;
}

export function LangSwitcher() {
  const { lang, setLang } = useLang();
  return (
    <select
      value={lang}
      onChange={(e) => setLang(e.target.value as Lang)}
      className="rounded-xl border border-cnx-line bg-transparent px-2 py-1.5 text-sm text-cnx-ink"
      aria-label="Language"
    >
      <option value="en">English</option>
      <option value="th">ไทย</option>
      <option value="zh">中文</option>
    </select>
  );
}
