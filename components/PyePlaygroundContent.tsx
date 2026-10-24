import Image from "next/image";
import { OptimizedImage } from "./OptimizedImage";
import { PyePlaygroundGallery } from "./PyePlaygroundGallery";
import { PyePlaygroundVideo } from "./PyePlaygroundVideo";
import { Squircle } from "./Squircle";

export { PyePlaygroundTeaserArt } from "./PyePlaygroundTeaserArt";

const mediaRoot = "pye-tryon-app/playground";
type MediaItem = { name: string; alt: string };
type MediaRow = MediaItem[] | { fields: [MediaItem[], MediaItem[]] };

const visualItems: Record<string, MediaRow[]> = {
  "01-current": [[{ name: "01-current-screen", alt: "Экран выпущенного приложения PYE" }]],
  "02-camera-first": [[{ name: "02-camera-hires-screen", alt: "Камера с названием и ценой оправы поверх отражения" }]],
  "03-mirror-screens": [[
    { name: "03-mirror-screen-b", alt: "Первый вариант надписи поверх камеры" },
    { name: "03-mirror-screen-c", alt: "Второй вариант надписи поверх камеры" },
    { name: "03-mirror-screen-d", alt: "Третий вариант надписи поверх камеры" },
  ]],
  "04-frame-as-lens": [{ fields: [
    [{ name: "04-camera-reference-screen", alt: "Фото-стили в камере iPhone" }],
    [{ name: "04-pye-lens-hires-screen", alt: "Выбор оправы как линзы в камере PYE" }],
  ] }],
  "05-flip-card": [{ fields: [
    [{ name: "05-flip-front-screen", alt: "Лицевая сторона карточки с примеркой" }],
    [{ name: "05-flip-back-screen", alt: "Обратная сторона карточки с фотографиями" }],
  ] }],
  "07-home-try-on": [{ fields: [
    [{ name: "07-try-on-screen", alt: "Шторка выбора оправ для домашней примерки" }],
    [{ name: "07-cart-screen", alt: "Сохранённые оправы и покупка в PYE" }],
  ] }],
};

function Media({ item }: { item: MediaItem }) {
  return (
    <Squircle cornerRadius={28} className="pye-playground__screen">
      <OptimizedImage assetKey={`${mediaRoot}/${item.name}`} alt={item.alt}
        sizes="(max-width: 800px) min(375px, calc(100vw - 32px)), 375px" lossless />
    </Squircle>
  );
}

function Visual({ name, alt, caption }: { name: string; alt: string; caption?: string }) {
  const composition = name === "03-mirror-composition" || name === "08-pye-bag";
  return (
    <figure className="pye-playground__visual">
      {composition ? (
        <div className="pye-playground__stage pye-playground__stage--composition">
          <OptimizedImage assetKey={`${mediaRoot}/${name === "08-pye-bag" ? "08-bag-composition" : name}`}
            alt={alt} sizes="(max-width: 1156px) 100vw, 1156px" lossless />
        </div>
      ) : visualItems[name].map((row) => {
        const fields = Array.isArray(row) ? [row] : row.fields;
        return (
          <div className={`pye-playground__fields pye-playground__fields--${fields.length}`} key={fields[0][0].name}>
            {fields.map((items) => (
              <div className={`pye-playground__stage pye-playground__stage--${items.length === 1 ? "one" : items.length === 2 ? "two" : "three"}`}
                key={items[0].name}>
                {items.map((item) => <Media key={item.name} item={item} />)}
              </div>
            ))}
          </div>
        );
      })}
      {caption && <figcaption className="pye-playground__caption">{caption}</figcaption>}
    </figure>
  );
}

function Chapter({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <section className="pye-playground__text pye-playground__chapter">
      <div className="pye-playground__chapter-number" aria-hidden="true">{number}</div>
      <h3>{title}</h3>
      {children}
    </section>
  );
}

export function PyePlaygroundContent() {
  return (
    <article className="pye-playground">
      <section className="pye-playground__text pye-playground__intro">
        <p>У PYE уже было работающее приложение для виртуальной примерки очков. Мы поддерживали и обновляли его. Параллельно я исследовал другой вопрос:</p>
        <blockquote>«Как сделать опыт примерки более иммерсивным и вовлекающим?»</blockquote>
        <p>Я хотел, чтобы камера, выбор оправы, фотография, сохранение и покупка ощущались единым бесшовным сценарием.</p>
      </section>

      <Visual name="01-current" alt="Текущая версия приложения PYE" caption="Текущая версия приложения" />

      <div className="pye-playground__text">
        <p>Виртуальная примерка — это в первую очередь камера. Но в существующей версии вокруг неё накопилось много интерфейса: выбор оправы и цвета, фото, избранное, карточка товара, примерка дома. Мне хотелось попробовать обратное: не помещать камеру внутрь интерфейса, а растворить интерфейс внутри камеры. Чтобы первым слоем оставался человек и его отражение, а всё остальное появлялось, когда нужно.</p>
      </div>

      <Visual name="02-camera-first" alt="Интерфейс внутри камеры PYE" />

      <Chapter number={1} title="Камера как зеркало">
        <p>В физическом мире примерка очков начинается с зеркала. Мне было интересно посмотреть, как вообще люди взаимодействуют с отражением. На выставках, в магазинах и публичных пространствах на зеркалах часто появляется текст. Он существует поверх отражения и дополняет опыт. А если сфотографироваться — текст останется вместе с отражением.</p>
      </Chapter>

      <Visual name="03-mirror-composition" alt="Надписи на зеркалах как референс для камеры" />

      <div className="pye-playground__text">
        <p>Эта логика хорошо ложилась на приложение: название оправы и её цена могут жить поверх камеры — почти как надпись на зеркале. Для PYE это было особенно полезно: чем чаще название оказывается рядом с оправой, тем быстрее оно становится узнаваемым и частью бренда.</p>
      </div>

      <Visual name="03-mirror-screens" alt="Три варианта надписи поверх камеры PYE" />

      <Chapter number={2} title="Интерфейс и лента оправ">
        <p>В существующем интерфейсе большая лента оправ занимает заметную часть экрана. Но разглядеть продукт в маленькой превьюшке всё равно сложно. Я хотел сделать выбор оправ компактнее и вернуть больше пространства камере. Вместе с лентой внизу лежат фильтры, выбор цвета, добавление в избранное и режим фото-видео съёмки. При этом важно отделить управление оправой и таббар.</p>
      </Chapter>

      <PyePlaygroundGallery />

      <div className="pye-playground__text">
        <p>Фотография — естественный результат примерки: человек уже смотрит на себя через камеру. Я хотел вынести съёмку из отдельного режима. В первых же вариантах вытащил кнопку съёмки и сделал привычный паттерн: короткое нажатие делает фото, удержание — записывает видео.</p>
        <p>В поисках, как компактно показать интерфейс и убрать перегруженность, я вспомнил, что в интерфейсе iPhone фото-стили переключаются карточками-линзами, меняя вид фотографии.</p>
        <p>Эта форма отлично подходит для переключения оправ: камера остаётся на месте, а пользователь перебирает варианты. Выбор модели переставал ощущаться отдельным каталогом, который перекрывает камеру, и становился частью примерки. Ещё такая форма учит пользователей свайпать карточки без обучения.</p>
      </div>

      <Visual name="04-frame-as-lens" alt="Фотостили iPhone и выбор оправы в PYE" />

      <div className="pye-playground__text">
        <p>AR хорошо отвечает на вопрос: «как эти очки выглядят на мне?». Но детали дужек и конструкцию оправы всё равно удобнее рассматривать на обычных фотографиях. Здесь карточка оправы может работать как физический объект: с одной стороны — примерка, с другой — подробности. Так камера оставалась главным пространством приложения, а информация о товаре появлялась, когда она нужна.</p>
      </div>

      <Visual name="05-flip-card" alt="Лицевая и обратная стороны карточки оправы" />

      <Chapter number={3} title="Домик оправ">
        <p>Очки — это вещь, с которой трудно определиться за секунду. Они сильно меняют то, как человек выглядит и ощущает себя. Идея классического «избранного» казалась слишком абстрактной. Кроме возвращения к оправам пользователи могут заказать бесплатную примерку домой. Нужно было одно понятное место, где можно собрать понравившиеся оправы, а уже потом решить, что с ними делать. Так появился <strong>домик</strong> — общее место для сохранённых моделей и домашней примерки.</p>
      </Chapter>

      <PyePlaygroundVideo />

      <div className="pye-playground__text">
        <p>До четырёх оправ можно примерить дома. Это стало частью самой механики: пользователь откладывает модели, которые понравились, в отдельную шторку. Пустые слоты показывают, сколько ещё можно добавить.</p>
      </div>

      <Visual name="07-home-try-on" alt="Состояния домашней примерки" />

      <div className="pye-playground__text">
        <p>Интерфейс не только сообщает ограничение, но и подталкивает взять побольше оправ для домашней примерки. Больше оправ — выше шанс оставить себе понравившуюся.</p>
        <p>Для покупки появился физический образ — пакет PYE. Сами пакеты — заметная часть визуальной культуры. Дизайн меняется каждый сезон. Выглядят как отдельные коллекционные объекты, но легко узнаются.</p>
      </div>

      <Visual name="08-pye-bag" alt="Пакеты PYE и концепция экрана покупки" />

      <section className="pye-playground__text pye-playground__ending">
        <p>Было интересно находить решения не только среди других приложений. Зеркало подсказало, как показать информацию поверх камеры. Линзы — как переключать оправы, а пакет — как отделить покупку от примерки. Интерфейс может использовать цифровые паттерны, но опыт физического мира у человека намного старше любого приложения. Мне хотелось, чтобы виртуальная примерка опиралась и на то, и на другое.</p>
        <Image className="pye-playground__ending-art" src="/illustrations/pye-playground-ending.svg" width={292} height={120} alt="Домик оправ с пакетом PYE" />
      </section>
    </article>
  );
}
