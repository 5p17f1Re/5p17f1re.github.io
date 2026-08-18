"use client";

import {
  type CSSProperties,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cases } from "@/data/cases";

const siteOrigin = "https://sevakudryavtsev.com";

const sourceOptions = [
  ["Telegram", "telegram"],
  ["LinkedIn", "linkedin"],
  ["Instagram", "instagram"],
  ["Behance", "behance"],
  ["Dribbble", "dribbble"],
  ["Read.cv", "readcv"],
  ["Medium", "medium"],
  ["Substack", "substack"],
  ["X / Twitter", "x"],
  ["Facebook", "facebook"],
  ["VK", "vk"],
  ["YouTube", "youtube"],
  ["TikTok", "tiktok"],
  ["Pinterest", "pinterest"],
  ["Reddit", "reddit"],
  ["GitHub", "github"],
  ["ADPList", "adplist"],
  ["VC.ru", "vc"],
  ["DTF", "dtf"],
  ["Product Hunt", "producthunt"],
  ["WhatsApp", "whatsapp"],
  ["Discord", "discord"],
  ["Slack", "slack"],
  ["Email / рассылка", "email"],
  ["QR-код офлайн", "qr"],
] as const;

const mediumOptions = [
  ["Публичное размещение", "social"],
  ["Личное сообщение", "messenger"],
  ["Письмо или рассылка", "email"],
  ["Ссылка с внешнего сайта", "referral"],
  ["QR-код", "qr"],
  ["Платное размещение", "paid_social"],
] as const;

const campaignOptions = [
  ["Портфолио", "portfolio"],
  ["Поиск работы", "job_search"],
  ["Обновление сайта или кейса", "site_update"],
  ["Нетворкинг", "networking"],
  ["Публикация", "publication"],
  ["Рекомендация", "recommendation"],
  ...cases.map(({ slug }) => [`Кейс: ${slug}`, `case_${slug}`] as const),
] as const;

const contentOptions = [
  ["Профиль", "profile"],
  ["Пост", "post"],
  ["Закреплённый пост", "pinned_post"],
  ["Комментарий", "comment"],
  ["Сторис", "story"],
  ["Видео", "video"],
  ["Telegram-канал", "channel"],
  ["Telegram-чат", "chat"],
  ["Личное сообщение", "dm"],
  ["Подпись письма", "signature"],
  ["Письмо или рассылка", "newsletter"],
  ["Карточка в каталоге", "listing"],
  ["QR-код на визитке", "business_card"],
  ["QR-код на событии", "event"],
  ["Ссылка в статье", "article"],
] as const;

type UtmValue = {
  source: string;
  medium: string;
  campaign: string;
  content: string;
};

function buildLink(path: string, values: UtmValue) {
  const parameters = new URLSearchParams();

  if (values.source) parameters.set("utm_source", values.source);
  if (values.medium) parameters.set("utm_medium", values.medium);
  if (values.campaign) parameters.set("utm_campaign", values.campaign);
  if (values.content) parameters.set("utm_content", values.content);

  const query = parameters.toString();
  return `${siteOrigin}${path}${query ? `?${query}` : ""}`;
}

export function UtmLinkGenerator() {
  const [path, setPath] = useState("/");
  const [values, setValues] = useState<UtmValue>({
    source: "",
    medium: "",
    campaign: "",
    content: "",
  });
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const link = useMemo(() => buildLink(path, values), [path, values]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  function updateValue(field: keyof UtmValue, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function copyLink() {
    if (timerRef.current) clearTimeout(timerRef.current);

    let copiedSuccessfully = false;

    try {
      await navigator.clipboard.writeText(link);
      copiedSuccessfully = true;
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = link;
      textarea.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(textarea);
      try {
        textarea.select();
        copiedSuccessfully = document.execCommand("copy");
      } catch {
        copiedSuccessfully = false;
      } finally {
        textarea.remove();
      }
    }

    if (!copiedSuccessfully) {
      setCopied(false);
      return;
    }

    setCopied(true);
    timerRef.current = setTimeout(() => setCopied(false), 3000);
  }

  return (
    <main id="main-content" className="utm-generator">
      <div className="utm-generator__controls" aria-label="UTM link generator">
        <AnimatedField
          className="utm-generator__field--page"
          label="Страница сайта"
          displayValue={`sevakudryavtsev.com${path}`}
          control={
          <select
            value={path}
            onChange={(event) => setPath(event.target.value)}
          >
            <option value="/">/</option>
            {cases.map(({ slug }) => (
              <option key={slug} value={`/${slug}/`}>
                /{slug}/
              </option>
            ))}
          </select>
          }
        >
          <span className="utm-generator__prefix">sevakudryavtsev.com</span>
          <span className="utm-generator__value">{path}</span>
        </AnimatedField>
        <UtmSelect
          leading="?"
          label="utm_source"
          options={sourceOptions}
          value={values.source}
          onChange={(value) => updateValue("source", value)}
        />
        <UtmSelect
          leading="&"
          label="utm_medium"
          options={mediumOptions}
          value={values.medium}
          onChange={(value) => updateValue("medium", value)}
        />
        <UtmSelect
          leading="&"
          label="utm_campaign"
          options={campaignOptions}
          value={values.campaign}
          onChange={(value) => updateValue("campaign", value)}
        />
        <UtmSelect
          leading="&"
          label="utm_content"
          options={contentOptions}
          value={values.content}
          onChange={(value) => updateValue("content", value)}
        />
      </div>
      <p className="visually-hidden" aria-live="polite">{link}</p>
      <div className="utm-generator__copy-slot">
        <button className="utm-generator__copy" type="button" onClick={copyLink}>
          Copy Link
        </button>
      </div>
      <div
        className={`utm-generator__toast${copied ? " is-visible" : ""}`}
        role="status"
        aria-live="polite"
        aria-hidden={!copied}
      >
        <span>
          Link
          <br />
          copied to clipboard
        </span>
      </div>
    </main>
  );
}

function UtmSelect({
  leading,
  label,
  options,
  value,
  onChange,
}: {
  leading: "?" | "&";
  label: string;
  options: readonly (readonly [string, string])[];
  value: string;
  onChange: (value: string) => void;
}) {
  const selectedValue = value || "Choose";

  return (
    <AnimatedField
      label={label}
      displayValue={`${leading}${label}=${selectedValue}`}
      control={
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">Choose</option>
          {options.map(([, optionValue]) => (
            <option key={optionValue} value={optionValue}>
              {optionValue}
            </option>
          ))}
        </select>
      }
    >
      <span className="utm-generator__prefix">{leading}{label}=</span>
      <span className="utm-generator__value">{selectedValue}</span>
    </AnimatedField>
  );
}

function AnimatedField({
  children,
  className = "",
  control,
  displayValue,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  control: React.ReactNode;
  displayValue: string;
  label: string;
}) {
  const contentRef = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState<number>();

  useLayoutEffect(() => {
    const contentWidth = contentRef.current?.getBoundingClientRect().width;
    if (contentWidth) setWidth(contentWidth + 16);
  }, [displayValue]);

  return (
    <label
      className={`utm-generator__field ${className}`}
      style={width ? ({ width } as CSSProperties) : undefined}
    >
      <span ref={contentRef} className="utm-generator__field-content">
        {children}
      </span>
      <span className="utm-generator__arrow" aria-hidden="true" />
      <span className="visually-hidden">{label}</span>
      {control}
    </label>
  );
}
