import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";

export const metadata: Metadata = {
  title: "Yandex Eats SmartReserve — Кейс",
  description: "Ведущий продуктовый дизайнер панели управления СмартРезерв.",
};

export default function SmartReservePage() {
  return (
    <main className="case-page-shell">
      <Navigation isCase />
      <div className="case-wrapper">
        <header className="case-header">
          <span className="project__tag">b2b</span>
          <span className="project__title">Yandex Eats SmartReserve</span>
        </header>

        <section className="case-hero">
          <div className="case-hero-content">
            <h1>Контекст</h1>
            <p>
              В 2024 году Яндекс приобрёл LeClick — сервис бронирования ресторанов.
              Платформа имела накопленную клиентскую базу и рабочие процессы, но
              была технически и визуально устаревшей.
            </p>
            <p>
              Задача команды — превратить сервис бронирований в полноценный
              продукт для ресторанов внутри экосистемы Яндекс Еды. За год работы
              продукт вырос в 4 раза по количеству пользователей, а рестораны
              получили единый инструмент для управления бронированиями, гостями,
              аналитикой и маркетингом.
            </p>
          </div>
        </section>

        <section className="case-section">
          <h2>Моя роль</h2>
          <p>
            Ведущий продуктовый дизайнер панели управления СмартРезерв. Отвечал
            за проектирование новых разделов, развитие архитектуры продукта,
            запуск ключевых сценариев и подготовку решений к разработке.
          </p>
          <ul className="case-role-list">
            <li>Дашборд аналитики</li>
            <li>Управление гостями, тегами и сегментами</li>
            <li>Отзывы и рейтинг ресторана</li>
            <li>Управление контентом ресторана</li>
            <li>Развитие навигации и структуры продукта</li>
          </ul>
        </section>

        <div className="case-dashboard-img">
          <Image
            src="/yandex-eats-smartreserve/assets/hero-img.jpg"
            alt="SmartReserve dashboard"
            width={2400}
            height={1600}
            sizes="100vw"
          />
        </div>

        <section className="case-section">
          <h2>Результаты</h2>
          <p>Мы добились функционального паритета с конкурентами.</p>
          <div className="case-metrics">
            <div className="case-metric">
              <div className="value">×4</div>
              <div className="label">рост пользователей</div>
            </div>
            <div className="case-metric">
              <div className="value">1390</div>
              <div className="label">ресторанов на новой авторизации</div>
            </div>
            <div className="case-metric">
              <div className="value">11→355</div>
              <div className="label">поддерживаемых сценариев</div>
            </div>
          </div>
        </section>
      </div>

      <Link href="/" className="case-close">
        <span aria-hidden>×</span>
        Закрыть
      </Link>
    </main>
  );
}
