# Chrome Benzeri Sekmeli Okuyucu Tasarimi

## Amaç

FilePeek AI varsayilan olarak Chrome benzeri bir belge tarayicisi gibi acilacak. Kullanici birden fazla belgeyi sekmelerde tutabilecek, sekmeler arasinda hizli gecis yapabilecek ve aktif belge uzerinden onizleme ile AI analiz araclarini kullanabilecek.

Bu tasarim mevcut dosya okuma, onizleme, AI ozetleme, soru-cevap, ceviri, sesli okuma ve Word/Excel duzenleme yeteneklerini korur. Degisiklik ana olarak arayuz kabugu ve aktif dosya durum yonetimi uzerindedir.

## Kapsam

Bu is kapsaminda uygulama arayuzu "Tam Chrome kabugu" yaklasimina tasinir:

- Ustte Chrome benzeri sekme cubugu.
- Sekmelerin altinda belge yolu / arama satiri.
- Ince sol arac paneli.
- Aktif belge icin ana onizleme alani.
- Aktif belgeye bagli AI analiz paneli.
- Chrome yeni sekme benzeri bos acilis ekrani.

Kapsam disi olanlar:

- Gercek web tarayici ozellikleri.
- Geri/ileri gezinme gecmisi.
- Sekme surukleyip siralama.
- Kalici sekme oturumu.
- Her sekme icin tam AI sohbet gecmisi.

## Arayuz

Uygulama acildiginda ana pencere Chrome benzeri bir belge kabugu gosterir. En ustte sekme cubugu bulunur. Her sekmede dosya tipi ikonu, kisaltilmis dosya adi ve kapatma butonu yer alir. Aktif sekme daha one cikmis gorunur.

Sekme cubugunun altinda adres cubuguna benzeyen bir satir bulunur. Bu satir aktif dosyanin yolunu kisaltilmis sekilde gosterir. Satirda dosya acma, aktif dosyayi yenileme ve gerekli hizli aksiyonlar icin ikonlu kontroller bulunur.

Sol taraf klasik genis sidebar yerine daha ince bir arac paneline donusur. Bu panelde dosya acma, son dosyalar, ayarlar ve destekleyici hizli islemler bulunur. Ana alan aktif belgenin onizlemesini gosterir. AI analiz paneli ana alanin saginda veya mevcut ekran genisligine gore alt bolumde konumlanir.

Hic acik belge yokken yeni sekme ekrani gosterilir. Bu ekranda buyuk dosya acma / surukle-birak alani, son belgeler ve desteklenen format kisayollari bulunur.

## Sekme Davranisi

Her dosya acma islemi yeni bir sekme olusturur. Ayni dosya yolu zaten aciksa yeni sekme acilmaz; uygulama mevcut sekmeye odaklanir.

Sekme kapatma davranisi:

- Aktif olmayan bir sekme kapatilinca aktif sekme degismez.
- Aktif sekme kapatilinca once sagdaki sekmeye gecilir.
- Sagda sekme yoksa soldaki sekmeye gecilir.
- Hic sekme kalmazsa yeni sekme ekrani gosterilir.

Sag tikla acilan dosyalar ve surukle-birakla acilan dosyalar da ayni sekme mantigindan gecer.

## Durum Modeli

Mevcut tekil `currentFileData` modeli, sekmeli durumu destekleyen bir modele donusur:

```js
openTabs = [
  {
    id,
    filePath,
    name,
    type,
    size,
    status,
    data,
    aiResult,
    error
  }
]

activeTabId = "..."
```

`status` degeri `loading`, `ready` veya `error` olabilir. Aktif sekme, onizleme ve AI kontrolleri icin tek kaynak olur. `currentFileData` gerekiyorsa geriye uyum icin aktif sekmeden turetilir.

## Veri Akisi

Dosya acma akisi:

1. Kullanici dosya secer, surukleyip birakir veya dosya sag tikla ile gelir.
2. `loadFile(filePath)` ayni yolun acik olup olmadigini kontrol eder.
3. Dosya aciksa `activeTabId` mevcut sekmeye ayarlanir.
4. Dosya acik degilse `loading` durumunda yeni sekme olusturulur.
5. `window.kankaAPI.peekFile(filePath)` ile dosya okunur.
6. Basarili sonuc sekmenin `data` alanina yazilir ve sekme `ready` olur.
7. Hata durumunda sekme `error` olur ve hata mesaji ana alanda gosterilir.

AI aksiyonlari aktif sekmenin verisini kullanir. Sonuc aktif sekmenin `aiResult` alanina yazilir. Kullanici sekme degistirdiginde onizleme ve AI sonucu aktif sekmeye gore yeniden render edilir.

## Hata Durumlari

Dosya okunamazsa sekme kapanmaz. Sekme hata durumunda kalir, ana alanda okunabilir bir hata mesaji ve yeniden deneme aksiyonu gosterilir.

Ayni dosya tekrar acilirsa yeni kopya olusmaz. Mevcut sekmeye gecilir ve kullanici ayni belgenin iki kez acilmasi nedeniyle karisiklik yasamaz.

Dosya yuklenirken kullanici sekme degistirebilir. Yukleme tamamlandiginda ilgili sekmenin durumu guncellenir; aktif sekme farkliysa ekran zorla degistirilmez.

## Test Plani

Elle dogrulanacak ana akislar:

- Uygulama acildiginda yeni sekme ekrani gorunur.
- Tek dosya acilinca yeni sekme olusur ve onizleme gorunur.
- Iki farkli dosya acilinca iki sekme gorunur.
- Ayni dosya tekrar acilinca mevcut sekmeye gecilir.
- Aktif olmayan sekme kapaninca aktif belge korunur.
- Aktif sekme kapaninca komsu sekmeye gecilir.
- Tum sekmeler kapaninca yeni sekme ekrani gorunur.
- Sag tikla acilan dosya yeni sekme mantigiyla acilir.
- AI ozet ve soru-cevap aktif sekmenin icerigiyle calisir.
- Dosya okunamayan durumda sekme hata ekrani gosterir ve uygulama calismaya devam eder.

## Kabul Kriterleri

- Varsayilan arayuz Chrome benzeri sekmeli kabukla acilir.
- Her yeni dosya yeni sekme olarak acilir.
- Ayni dosya yolu tekrar acildiginda mevcut sekmeye odaklanilir.
- Aktif sekmeye gore onizleme, dosya bilgisi ve AI sonucu degisir.
- Mevcut dosya formatlari ve AI ozellikleri korunur.
- Bos durumda yeni sekme ekrani gosterilir.
- Sekme kapatma davranisi tutarli ve ongorulebilirdir.
