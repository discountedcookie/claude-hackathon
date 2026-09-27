"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

export type Lang = "en" | "th" | "zh";

type Dict = Record<string, Record<Lang, string>>;

export const strings: Dict = {
  heroTitle: { en: "Find your event buddy.", th: "หาเพื่อนไปงานด้วยกัน", zh: "找个伴，一起去。" },
  heroNote: { en: "Your first time feels easier with a buddy.", th: "ไปครั้งแรกก็อุ่นใจ เมื่อมีเพื่อนไปด้วย", zh: "第一次参加？有人陪你一起。" },
  heroProjectsTitle: { en: "Build something, together.", th: "มาสร้างอะไรด้วยกัน", zh: "一起做点什么。" },
  heroProjectsNote: { en: "No pay, no hiring. Just making things.", th: "ร่วมมือกันแบบไม่มีค่าจ้าง", zh: "不谈报酬，不招聘，一起做点东西。" },
  sayHi: { en: "Say hi to your buddies", th: "ทักทายเพื่อนของคุณ", zh: "和小伙伴打个招呼" },
  tabEvents: { en: "Events", th: "กิจกรรม", zh: "活动" },
  tabProjects: { en: "Projects", th: "โปรเจกต์", zh: "项目" },
  signOut: { en: "Sign out", th: "ออกจากระบบ", zh: "退出" },
  pasteLink: { en: "Add a lu.ma event", th: "เพิ่มงานจาก lu.ma", zh: "添加 lu.ma 活动" },
  addEvent: { en: "Add", th: "เพิ่ม", zh: "添加" },
  cancel: { en: "Cancel", th: "ยกเลิก", zh: "取消" },
  counter: { en: "{n} matched", th: "จับคู่แล้ว {n} คู่", zh: "已配对 {n} 对" },
  dateTbd: { en: "date TBD", th: "ยังไม่ระบุวัน", zh: "日期待定" },
  venueTbd: { en: "venue TBD", th: "ยังไม่ระบุสถานที่", zh: "地点待定" },
  imGoing: { en: "I'm going", th: "ฉันจะไป", zh: "我要去" },
  going: { en: "Going", th: "จะไป", zh: "要去" },
  notGoing: { en: "Not going", th: "ไม่ไปแล้ว", zh: "不去了" },
  whyGoingPh: { en: "Why you're going", th: "ทำไมถึงไป", zh: "为什么去" },
  othersGoing: { en: "Also going", th: "คนอื่นที่จะไป", zh: "也要去的人" },
  nobodyElse: { en: "Nobody else yet.", th: "ยังไม่มีใคร", zh: "暂时还没有别人" },
  pending: { en: "Pending", th: "รอตอบรับ", zh: "等待回复" },
  accepted: { en: "Accepted", th: "ตอบรับแล้ว", zh: "已接受" },
  declined: { en: "Declined", th: "ปฏิเสธแล้ว", zh: "已拒绝" },
  wantsToGo: { en: "{name} wants to go with you", th: "{name} อยากไปงานนี้กับคุณ", zh: "{name} 想和你一起去" },
  myBuddies: { en: "My buddies", th: "เพื่อนที่ไปด้วยกัน", zh: "我的伙伴" },
  registerOnLuma: { en: "Register", th: "ลงทะเบียน", zh: "报名" },
  draftFollowUp: { en: "Draft message", th: "ร่างข้อความ", zh: "起草消息" },
  forThem: { en: "In their language", th: "ในภาษาของเขา", zh: "用对方的语言" },
  forYou: { en: "What it says", th: "แปลว่า", zh: "意思是" },
  copy: { en: "Copy", th: "คัดลอก", zh: "复制" },
  copied: { en: "Copied", th: "คัดลอกแล้ว", zh: "已复制" },
  busy: { en: "Busy right now — try again in a bit.", th: "ตอนนี้คนใช้เยอะ — ลองใหม่อีกสักครู่", zh: "现在有点忙——请稍后再试" },
  rateLimited: { en: "That's enough for now — try again later.", th: "พอก่อนสำหรับตอนนี้ — ลองใหม่ภายหลัง", zh: "先到这里——稍后再试" },
  freeOnly: { en: "Only free events for now.", th: "ตอนนี้รับเฉพาะงานฟรี", zh: "目前只支持免费活动" },
  privateEvent: { en: "Couldn't read that event — is it private?", th: "อ่านข้อมูลงานไม่ได้ — เป็นงานส่วนตัวหรือเปล่า?", zh: "无法读取该活动——是私密活动吗？" },
  somethingWrong: { en: "Something went wrong.", th: "มีบางอย่างผิดพลาด", zh: "出了点问题" },
  locWhere: { en: "Where are you?", th: "คุณอยู่ที่ไหน?", zh: "你在哪里？" },
  locSearchPh: { en: "search a city or place", th: "ค้นหาเมืองหรือสถานที่", zh: "搜索城市或地点" },
  locOrTap: { en: "…or tap the map", th: "…หรือแตะบนแผนที่", zh: "……或在地图上点选" },
  locUse: { en: "Use this place", th: "ใช้ที่นี่", zh: "使用这个位置" },
  locChange: { en: "Change", th: "เปลี่ยน", zh: "更换" },
  locNear: { en: "Near {place}", th: "ใกล้ {place}", zh: "{place}附近" },
  safetyShare: { en: "Share location", th: "แชร์ตำแหน่ง", zh: "分享位置" },
  safetyLive: { en: "Sharing live", th: "กำลังแชร์ตำแหน่ง", zh: "正在实时分享" },
  copyLink: { en: "Copy link", th: "คัดลอกลิงก์", zh: "复制链接" },
  shareLine: { en: "Share to LINE", th: "แชร์ไปที่ LINE", zh: "分享到 LINE" },
  imSafe: { en: "I'm safe", th: "ฉันปลอดภัยแล้ว", zh: "我已安全" },
  shareEnded: { en: "Sharing has ended.", th: "การแชร์ตำแหน่งสิ้นสุดแล้ว", zh: "分享已结束。" },
  shareWaiting: { en: "Waiting for their location…", th: "กำลังรอตำแหน่ง…", zh: "正在等待位置……" },
  shareUpdated: { en: "updated {s}s ago", th: "อัปเดตเมื่อ {s} วินาทีที่แล้ว", zh: "{s} 秒前更新" },
  shareOf: { en: "{name} · {event}", th: "{name} · {event}", zh: "{name} · {event}" },
  onbTitle: { en: "Let's get to know you", th: "มาทำความรู้จักกัน", zh: "认识一下你" },
  onbHello: { en: "Hi! What should people call you, and which languages do you speak?", th: "สวัสดี! อยากให้เรียกคุณว่าอะไร และพูดภาษาอะไรได้บ้าง?", zh: "你好！大家怎么称呼你？你会说哪些语言？" },
  onbPh: { en: "type your answer", th: "พิมพ์คำตอบ", zh: "输入你的回答" },
  onbLeft: { en: "{n} left", th: "เหลือ {n}", zh: "还剩 {n}" },
  onbDone: { en: "All set! Taking you to events…", th: "เรียบร้อย! กำลังพาไปดูงาน…", zh: "好了！正在带你去看活动……" },
  signIn: { en: "Sign in", th: "เข้าสู่ระบบ", zh: "登录" },
  signUp: { en: "Create account", th: "สมัครสมาชิก", zh: "注册" },
  needAccount: { en: "need an account?", th: "ยังไม่มีบัญชี?", zh: "还没有账号？" },
  haveAccount: { en: "have one already?", th: "มีบัญชีแล้ว?", zh: "已有账号？" },
  emailPh: { en: "email", th: "อีเมล", zh: "邮箱" },
  passwordPh: { en: "password", th: "รหัสผ่าน", zh: "密码" },
  namePh: { en: "your name", th: "ชื่อของคุณ", zh: "你的名字" },
  linePh: { en: "LINE ID", th: "LINE ID", zh: "LINE ID" },
  hello: { en: "Hi!", th: "สวัสดี!", zh: "你好！" },
  checkEmail: { en: "Check your email to confirm your account, then sign in.", th: "กรุณายืนยันบัญชีทางอีเมล แล้วเข้าสู่ระบบ", zh: "请查收邮件确认账号，然后登录。" },
  lvl_basic: { en: "basic", th: "พื้นฐาน", zh: "入门" },
  lvl_conversational: { en: "conversational", th: "สื่อสารได้", zh: "能交流" },
  lvl_fluent: { en: "fluent", th: "คล่อง", zh: "流利" },
  lvl_native: { en: "native", th: "เจ้าของภาษา", zh: "母语" },
  leaveReview: { en: "Submit", th: "ส่ง", zh: "提交" },
  noShowBtn: { en: "No-show", th: "ไม่มา", zh: "未到场" },
  youGave: { en: "You", th: "คุณ", zh: "你" },
  howWas: { en: "A few words", th: "เขียนสั้นๆ", zh: "简单说两句" },
  newProject: { en: "Start a project", th: "เริ่มโปรเจกต์", zh: "发起项目" },
  describeProjectPh: { en: "What you're making and who you want along. Any language.", th: "ทำอะไรอยู่ และอยากได้ใครมาร่วม เขียนภาษาไหนก็ได้", zh: "你在做什么，想找谁一起？用任何语言都行。" },
  requestJoin: { en: "Ask to join", th: "ขอเข้าร่วม", zh: "申请加入" },
  requestMissionPh: { en: "Why you'd like to join", th: "ทำไมอยากเข้าร่วม", zh: "为什么想加入" },
  requests: { en: "Requests", th: "คำขอ", zh: "申请" },
  accept: { en: "Accept", th: "รับ", zh: "接受" },
  decline: { en: "Decline", th: "ปฏิเสธ", zh: "拒绝" },
  myProjects: { en: "My projects", th: "โปรเจกต์ของฉัน", zh: "我的项目" },
  joinedProjects: { en: "Joined", th: "เข้าร่วมแล้ว", zh: "已加入" },
  closeProject: { en: "Close", th: "ปิดโปรเจกต์", zh: "关闭项目" },
  teamLine: { en: "Team", th: "ทีม", zh: "团队" },
  catSocial: { en: "Social", th: "สังสรรค์", zh: "轻松认识" },
  catBuild: { en: "Build & learn", th: "สร้างและเรียนรู้", zh: "一起创造" },
  catLocalLife: { en: "Local life", th: "ชีวิตท้องถิ่น", zh: "本地生活" },
  goingCount: { en: "{n} going", th: "{n} คนจะไป", zh: "{n} 人要去" },
  hideWho: { en: "Hide", th: "ซ่อน", zh: "收起" },
  findingEvents: { en: "Loading…", th: "กำลังโหลด…", zh: "加载中…" },
  noLine: { en: "not shared", th: "ไม่ได้ระบุ", zh: "未提供" },
  notLuma: { en: "That doesn't look like a lu.ma event link.", th: "ลิงก์นี้ไม่ใช่ลิงก์งานของ lu.ma", zh: "这不像是 lu.ma 的活动链接" },
  projectTooShort: { en: "Tell us a bit more (at least 10 characters).", th: "เล่าเพิ่มอีกนิด (อย่างน้อย 10 ตัวอักษร)", zh: "再多写一点（至少 10 个字）" },
  authInvalid: { en: "Wrong email or password.", th: "อีเมลหรือรหัสผ่านไม่ถูกต้อง", zh: "邮箱或密码不正确" },
  authUnconfirmed: { en: "Please confirm your email first.", th: "กรุณายืนยันอีเมลก่อน", zh: "请先确认你的邮箱" },
  authExists: { en: "An account with this email already exists.", th: "อีเมลนี้มีบัญชีอยู่แล้ว", zh: "该邮箱已注册" },
  authWeak: { en: "Password is too weak (at least 6 characters).", th: "รหัสผ่านง่ายเกินไป (อย่างน้อย 6 ตัวอักษร)", zh: "密码太简单（至少 6 位）" },
  more: { en: "more", th: "อ่านต่อ", zh: "展开" },
  less: { en: "less", th: "ย่อ", zh: "收起" },
  addNote: { en: "Add a note", th: "เพิ่มโน้ต", zh: "添加备注" },
  save: { en: "Save", th: "บันทึก", zh: "保存" },
  ask: { en: "Ask", th: "ชวน", zh: "邀请" },
  cancelBuddy: { en: "Cancel plan", th: "ยกเลิกนัด", zh: "取消约定" },
  secRate: { en: "Rate {name}", th: "ให้คะแนน {name}", zh: "给 {name} 评分" },
  secFollow: { en: "Message {name}", th: "ส่งข้อความถึง {name}", zh: "给 {name} 发消息" },
  howItWorks: { en: "How it works", th: "ใช้งานอย่างไร", zh: "怎么用" },
  close: { en: "Close", th: "ปิด", zh: "关闭" },
  faqEvQ1: { en: "How do I find a buddy?", th: "หาเพื่อนไปงานได้อย่างไร?", zh: "怎么找到伙伴？" },
  faqEvA1: { en: "Tap “I'm going” on an event to see who else is going. Ask someone to go together. When they accept, you both see each other's LINE.", th: "กด “ฉันจะไป” ที่งานที่สนใจ แล้วจะเห็นว่ามีใครจะไปบ้าง ชวนใครสักคนไปด้วยกัน เมื่อเขาตอบรับ ทั้งสองคนจะเห็น LINE ของกันและกัน", zh: "在活动上点“我要去”，就能看到还有谁要去。邀请一个人一起去，对方接受后，你们就能看到彼此的 LINE。" },
  faqEvQ2: { en: "Do I still need to register?", th: "ยังต้องลงทะเบียนเองไหม?", zh: "还需要自己报名吗？" },
  faqEvA2: { en: "Yes. Register on the event's Luma page yourself. We only help you find someone to go with.", th: "ต้องลงทะเบียนเองในหน้า Luma ของงาน เราแค่ช่วยหาเพื่อนไปด้วยกัน", zh: "需要。请在活动的 Luma 页面自己报名，我们只帮你找同行的伙伴。" },
  faqEvQ3: { en: "Who can see my LINE ID?", th: "ใครเห็น LINE ID ของฉันบ้าง?", zh: "谁能看到我的 LINE ID？" },
  faqEvA3: { en: "Only people you've both agreed to go with.", th: "เฉพาะคนที่ตกลงไปด้วยกันแล้วทั้งสองฝ่าย", zh: "只有你们双方都同意一起去的人。" },
  faqEvQ4: { en: "What is location sharing?", th: "การแชร์ตำแหน่งคืออะไร?", zh: "位置分享是什么？" },
  faqEvA4: { en: "From 2 hours before an event until 1 hour after it, you can send a friend a link that shows where you are. It stops by itself, nothing is saved, and your buddy never gets the link.", th: "ตั้งแต่ 2 ชั่วโมงก่อนงานจนถึง 1 ชั่วโมงหลังงาน คุณส่งลิงก์ให้เพื่อนดูตำแหน่งของคุณได้ ลิงก์จะหยุดเอง ไม่มีการบันทึกตำแหน่ง และเพื่อนที่ไปด้วยจะไม่ได้ลิงก์นี้", zh: "从活动开始前 2 小时到结束后 1 小时，你可以把一个链接发给朋友，让对方看到你的位置。时间一到自动停止，不会保存任何位置，你的活动伙伴也拿不到这个链接。" },
  faqEvQ5: { en: "Why only free events?", th: "ทำไมมีแต่งานฟรี?", zh: "为什么只有免费活动？" },
  faqEvA5: { en: "To keep it simple and low-risk, we only list free, public events.", th: "เพื่อให้ใช้ง่ายและไม่มีความเสี่ยง เราจึงแสดงเฉพาะงานฟรีที่เปิดสาธารณะ", zh: "为了简单、没有风险，我们只展示免费的公开活动。" },
  faqPrQ1: { en: "What is a project?", th: "โปรเจกต์คืออะไร?", zh: "项目是什么？" },
  faqPrA1: { en: "Something people do together for free: no pay, no job offers.", th: "กิจกรรมที่ทำด้วยกันแบบไม่มีค่าจ้าง ไม่ใช่การรับสมัครงาน", zh: "大家免费一起做的事：没有报酬，也不是招聘。" },
  faqPrQ2: { en: "How do I join?", th: "จะเข้าร่วมได้อย่างไร?", zh: "怎么加入？" },
  faqPrA2: { en: "Tell the owner why you'd like to join. If they accept, you both see each other's LINE.", th: "บอกเจ้าของโปรเจกต์ว่าทำไมอยากเข้าร่วม ถ้าเขาตอบรับ ทั้งสองคนจะเห็น LINE ของกันและกัน", zh: "告诉发起人你为什么想加入。对方接受后，你们就能看到彼此的 LINE。" },
  faqPrQ3: { en: "How do I start one?", th: "จะเริ่มโปรเจกต์ได้อย่างไร?", zh: "怎么发起项目？" },
  faqPrA3: { en: "Describe it in any language. We write the listing in English, Thai and Chinese.", th: "เล่าเป็นภาษาอะไรก็ได้ เราจะเขียนประกาศเป็นภาษาอังกฤษ ไทย และจีนให้", zh: "用任何语言描述都可以，我们会帮你写成英文、泰文和中文的介绍。" },
  sendLine: { en: "Send on LINE", th: "ส่งทาง LINE", zh: "用 LINE 发送" },
  locMine: { en: "Use my location", th: "ใช้ตำแหน่งปัจจุบัน", zh: "使用当前位置" },
  suggestPeople: { en: "Suggest people", th: "แนะนำคน", zh: "推荐人选" },
  suggested: { en: "Suggested", th: "คนที่น่าจะเหมาะ", zh: "推荐" },
  askPh: { en: "Say hi", th: "ทักทาย", zh: "打个招呼" },
  meetLabel: { en: "Meet", th: "เจอกันที่", zh: "见面" },
  openersLabel: { en: "Ask about", th: "ชวนคุยเรื่อง", zh: "可以聊" },
  ratedLine: { en: "Rated", th: "ให้คะแนนแล้ว", zh: "已评价" },
  faqPrQ4: { en: "Why no suggestions?", th: "ทำไมไม่มีคนแนะนำ?", zh: "为什么没有推荐？" },
  faqPrA4: { en: "We suggest people you've already been to an event with.", th: "เราแนะนำเฉพาะคนที่คุณเคยไปงานด้วยกันแล้ว", zh: "我们只推荐和你一起参加过活动的人。" },
  faqEvQ6: { en: "What does “Add” do?", th: "ปุ่ม “เพิ่ม” ทำอะไร?", zh: "“添加”是做什么的？" },
  faqEvA6: { en: "If an event isn't listed, paste its lu.ma link. We add it and mark you as going.", th: "ถ้าไม่เจองานที่อยากไป วางลิงก์ lu.ma ได้เลย เราจะเพิ่มงานให้และบันทึกว่าคุณจะไป", zh: "如果没找到活动，粘贴它的 lu.ma 链接，我们会添加活动并记下你要去。" },
  nothingYet: { en: "No free events near here yet.", th: "ยังไม่มีงานฟรีแถวนี้", zh: "附近暂时没有免费活动" },
  summaryPending: { en: "Translating…", th: "กำลังแปล…", zh: "翻译中…" },
  original: { en: "Original", th: "ต้นฉบับ", zh: "原文" },
  noProjects: { en: "No projects yet.", th: "ยังไม่มีโปรเจกต์", zh: "暂时还没有项目" },
};

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void; userId: string | null }>({
  lang: "en",
  setLang: () => {},
  userId: null,
});

// A language picked before signing in (login page) is remembered here and applied to the profile at sign-in.
export const PICKED_LANG_KEY = "cnx-lang";

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

  // Correct CJK glyphs, Thai line breaking and screen-reader voice depend on <html lang>.
  useEffect(() => {
    document.documentElement.lang = HTML_LANG[lang];
  }, [lang]);

  function setLang(l: Lang) {
    setLangState(l);
    // Client created lazily so pages using this provider can be prerendered without Supabase env vars.
    if (userId) createClient().from("profiles").update({ language: l }).eq("id", userId).then();
  }

  return <LangContext.Provider value={{ lang, setLang, userId }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}

const HTML_LANG: Record<Lang, string> = { en: "en", th: "th", zh: "zh-Hans" };
const DATE_LOCALE: Record<Lang, string> = { en: "en-GB", th: "th-TH", zh: "zh-CN" };

// t("key", { name: "Mali" }) fills {name}; word order lives in each translation, never in the JSX.
export function useT() {
  const { lang } = useLang();
  return (key: keyof typeof strings, vars?: Record<string, string | number>) => {
    const text = strings[key]?.[lang] ?? key;
    return vars ? text.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? "")) : text;
  };
}

// Parts for the prototype-style date tile: big day, short month, weekday + time.
export function useDateParts() {
  const { lang } = useLang();
  return (iso: string, timeZone?: string | null) => {
    const f = (o: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat(DATE_LOCALE[lang], { ...o, timeZone: timeZone ?? undefined }).format(new Date(iso));
    const day = new Intl.DateTimeFormat(DATE_LOCALE[lang], { day: "numeric", timeZone: timeZone ?? undefined })
      .formatToParts(new Date(iso))
      .find((p) => p.type === "day")?.value;
    return {
      day: day ?? "",
      month: f({ month: "short" }),
      weekday: f({ weekday: "short" }),
      time: f({ hour: "numeric", minute: "2-digit" }),
    };
  };
}

export function LangSwitcher() {
  const { lang, setLang, userId } = useLang();
  return (
    <select
      value={lang}
      onChange={(e) => {
        const l = e.target.value as Lang;
        setLang(l);
        if (!userId)
          try {
            localStorage.setItem(PICKED_LANG_KEY, l);
          } catch {}
      }}
      className="rounded-lg border border-cnx-line bg-transparent px-1.5 py-1 text-sm text-cnx-ink"
      aria-label="Language"
    >
      <option value="en">EN</option>
      <option value="th">ไทย</option>
      <option value="zh">中文</option>
    </select>
  );
}
