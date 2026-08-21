import { getPublishedPhotos, groupPhotosByYearAndMonth } from "@/data/photos";
import type { SiteLocale } from "@/data/locales";
import { getUiText } from "@/data/ui-text";
import { PhotoImage } from "./PhotoImage";

function formatPhotoDate(date: string, locale: SiteLocale) {
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
}

function formatMonth(month: string, year: string, locale: SiteLocale) {
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", {
    month: "long",
  }).format(new Date(`${year}-${month}-01T12:00:00Z`));
}

export function PhotoFeed({ locale }: { locale: SiteLocale }) {
  const text = getUiText(locale);
  const groupedPhotos = groupPhotosByYearAndMonth(getPublishedPhotos());

  return (
    <main className="photo-page">
      <header className="photo-page__header">
        <p className="photo-page__eyebrow">{text.photosEyebrow}</p>
        <h1 className="photo-page__title">{text.photosTitle}</h1>
        <p className="photo-page__description">{text.photosDescription}</p>
      </header>

      {groupedPhotos.length === 0 ? (
        <p className="photo-page__empty">{text.photosEmpty}</p>
      ) : (
        <div className="photo-page__groups">
          {groupedPhotos.map((yearGroup) => (
            <section className="photo-year" key={yearGroup.year}>
              <h2 className="photo-year__title">{yearGroup.year}</h2>
              <div className="photo-year__months">
                {yearGroup.months.map((monthGroup) => (
                  <section className="photo-month" key={`${yearGroup.year}-${monthGroup.month}`}>
                    <h3 className="photo-month__title">
                      {formatMonth(monthGroup.month, yearGroup.year, locale)}
                    </h3>
                    <div className="photo-grid">
                      {monthGroup.photos.map((photo) => (
                        <figure className="photo-card" key={photo.id}>
                          <PhotoImage assetKey={photo.assetKey} alt={photo.alt} />
                          <figcaption className="photo-card__caption">
                            <div className="photo-card__heading">
                              <strong>{photo.title ?? formatPhotoDate(photo.date, locale)}</strong>
                              <time dateTime={photo.date}>{formatPhotoDate(photo.date, locale)}</time>
                            </div>
                            {photo.caption ? <p>{photo.caption}</p> : null}
                            {photo.location ? <p>{text.photosLocation}: {photo.location}</p> : null}
                            <p className="photo-card__metadata">
                              {photo.metadata.width} × {photo.metadata.height}
                              {photo.metadata.camera ? ` · ${photo.metadata.camera}` : ""}
                              {photo.metadata.lens ? ` · ${photo.metadata.lens}` : ""}
                            </p>
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
