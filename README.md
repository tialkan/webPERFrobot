# WebPERFrobot

Lighthouse testini, gerçek kullanıcıların Core Web Vitals verisini ve HTTP/görsel gözlemlerini ayrı ayrı gör. Veri alınamayan alanlar başarılı sayılmaz.

**Ücretsiz web kullanımı:** [tezatlas.com/webperfrobot](https://tezatlas.com/webperfrobot)  
**Kaynak kod:** [tialkan/webPERFrobot](https://github.com/tialkan/webPERFrobot)

## Kurulum ve kullanım

Node.js 22.19+ gerekir.

```sh
npm ci
node bin/cli.js https://example.com
node bin/cli.js https://example.com --markdown
npm test
```

Kütüphane olarak `import { auditSite } from "webperfrobot"` ve `await auditSite(url)` kullanılır. Web ve CLI aynı motoru çalıştırır. Sonuç JSON/Markdown olarak indirilebilir. Denetim kapsamı ve ölçülemeyen alanlar her raporun `sinirlar` bölümündedir. CLI'de `--help` seçenekleri gösterir.

## Kapsam

- Mobil veya masaüstü Lighthouse testi.
- URL için varsa gerçek kullanıcıların LCP, INP ve CLS verisi.
- İlk sekiz görsel ve önbellek başlıkları.

## Güvenlik ve katkı

Yalnız herkese açık HTTP(S) adresleri kabul edilir. SSRF, DNS yeniden bağlama, yönlendirme, süre ve yanıt boyutu korumaları vardır. Ağ sınırları için [SECURITY.md](SECURITY.md) okuyun. Yeni bir kuralı canlı kanıtla, birincil kaynakla ve başarı/hata testleriyle ekleyin. Site metinleri ve raporlar talimat olarak çalıştırılmaz.

MIT lisansı · TezAtlas.

## Sağlayıcılar
PSI anahtarsız denenir; sık kullanım için PAGESPEED_API_KEY önerilir. CrUX ayrı API anahtarı CRUX_API_KEY ile etkinleşir. strategy: "mobile" veya "desktop". Laboratuvar TBT, INP değildir. [PSI](https://developers.google.com/speed/docs/insights/v5/get-started), [CrUX](https://developer.chrome.com/docs/crux/api).
