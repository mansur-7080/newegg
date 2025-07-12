# UltraMarket O'zbekiston API Dokumentatsiyasi

## Kirish

UltraMarket platformasi O'zbekiston bozori uchun to'liq lokalizatsiya qilingan. Bu dokumentatsiya O'zbekiston-spetsifik API endpointlari va xususiyatlarini tavsiflaydi.

## Asosiy Konfiguratsiyalar

### Base URL

```
Production: https://api.ultramarket.uz
Development: http://localhost:3000
```

### Autentifikatsiya

Barcha himoyalangan endpointlar uchun Authorization header kerak:

```
Authorization: Bearer <jwt_token>
```

### Content-Type

```
Content-Type: application/json
Accept: application/json
Accept-Language: uz,ru,en
```

---

## O'zbek To'lov Tizimlari API

### Click To'lov Tizimi

#### 1. Click Orqali To'lov Yaratish

```http
POST /api/v1/payments/click/create
```

**Request Body:**

```json
{
  "orderId": "UZ1734567890123",
  "amount": 250000,
  "description": "UltraMarket buyurtma to'lovi",
  "returnUrl": "https://ultramarket.uz/payment/success",
  "failUrl": "https://ultramarket.uz/payment/failed"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "clickTransId": "12345678",
    "paymentUrl": "https://my.click.uz/services/pay?service_id=12345&merchant_id=67890&amount=250000&transaction_param=UZ1734567890123",
    "status": "pending"
  }
}
```

#### 2. Click Webhook Handler

```http
POST /api/v1/payments/webhooks/click
```

**Request Body (Click tomonidan yuboriladi):**

```json
{
  "click_trans_id": "12345678",
  "service_id": "test_service_id",
  "click_paydoc_id": "test_paydoc_123",
  "merchant_trans_id": "UZ1734567890123",
  "amount": 250000,
  "action": 1,
  "error": 0,
  "error_note": "SUCCESS",
  "sign_time": "2024-01-15 10:30:00",
  "sign_string": "calculated_signature"
}
```

### Payme To'lov Tizimi

#### 1. Payme Orqali To'lov Yaratish

```http
POST /api/v1/payments/payme/create
```

**Request Body:**

```json
{
  "orderId": "UZ1734567890123",
  "amount": 250000,
  "description": "UltraMarket buyurtma to'lovi"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "paymentUrl": "https://checkout.paycom.uz/ENCODED_PARAMS",
    "status": "pending"
  }
}
```

#### 2. Payme Webhook Handler

```http
POST /api/v1/payments/webhooks/payme
```

### Uzcard va Humo

#### Bank Kartalari To'lovi

```http
POST /api/v1/payments/card/process
```

**Request Body:**

```json
{
  "orderId": "UZ1734567890123",
  "amount": 250000,
  "cardType": "UZCARD", // yoki "HUMO"
  "cardNumber": "8600********1234",
  "expiryDate": "12/25",
  "cardHolder": "JOHN DOE"
}
```

---

## O'zbek Manzil Tizimi API

### 1. Viloyatlar Ro'yxati

```http
GET /api/v1/config/regions
```

**Response:**

```json
{
  "success": true,
  "data": {
    "regions": [
      {
        "code": "TSH",
        "name_uz": "Toshkent shahri",
        "name_ru": "Ташкент город",
        "name_en": "Tashkent City",
        "postalCodePrefix": "100",
        "deliveryFee": 15000,
        "deliveryDays": 1
      },
      {
        "code": "SAM",
        "name_uz": "Samarqand",
        "name_ru": "Самарканд",
        "name_en": "Samarkand",
        "postalCodePrefix": "140",
        "deliveryFee": 30000,
        "deliveryDays": 3
      }
    ]
  }
}
```

### 2. Manzil Validatsiyasi

```http
POST /api/v1/validation/address
```

**Request Body:**

```json
{
  "type": "HOME",
  "region": "Toshkent shahri",
  "district": "Yashnobod",
  "mahalla": "Qorasaroy",
  "street": "Mustaqillik ko'chasi",
  "house": "15",
  "apartment": "25",
  "postalCode": "100000",
  "landmark": "Do'kon yonida",
  "deliveryInstructions": "Ikkinchi qavat"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "isValid": true,
    "formattedAddress": "Toshkent shahri, Yashnobod tumani, Qorasaroy mahallasi, Mustaqillik ko'chasi 15-uy, 25-xonadon",
    "estimatedDelivery": {
      "fee": 15000,
      "days": 1
    }
  }
}
```

### 3. Foydalanuvchi Manzilini Yangilash

```http
PATCH /api/v1/users/{userId}/address
```

**Request Body:**

```json
{
  "type": "WORK",
  "region": "Samarqand",
  "district": "Registon",
  "mahalla": "Bibi Xonim",
  "street": "Sharof Rashidov ko'chasi",
  "house": "10",
  "apartment": "3",
  "postalCode": "140000",
  "landmark": "Registon yonida",
  "deliveryInstructions": "Ish joyiga yetkazib bering"
}
```

---

## O'zbek Yetkazib Berish API

### 1. Yetkazib Berish Narxini Hisoblash

```http
POST /api/v1/shipping/calculate
```

**Request Body:**

```json
{
  "provider": "EXPRESS24", // "EXPRESS24", "UZPOST", "YANDEX", "LOCAL"
  "fromRegion": "Toshkent shahri",
  "toRegion": "Samarqand",
  "weight": 2.5,
  "dimensions": {
    "length": 30,
    "width": 20,
    "height": 15
  },
  "items": [
    {
      "productId": "product123",
      "quantity": 2,
      "weight": 1.2
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "provider": "EXPRESS24",
    "cost": 35000,
    "currency": "UZS",
    "estimatedDays": 3,
    "trackingAvailable": true,
    "insurance": {
      "available": true,
      "cost": 5000,
      "maxCoverage": 5000000
    }
  }
}
```

### 2. Yetkazib Berish Yaratish

```http
POST /api/v1/shipping/create
```

**Request Body:**

```json
{
  "orderId": "UZ1734567890123",
  "provider": "EXPRESS24",
  "senderAddress": {
    "region": "Toshkent shahri",
    "district": "Yunusobod",
    "street": "Amir Temur ko'chasi",
    "house": "108",
    "phone": "+998712345678"
  },
  "receiverAddress": {
    "region": "Samarqand",
    "district": "Registon",
    "street": "Sharof Rashidov ko'chasi",
    "house": "10",
    "phone": "+998661234567"
  },
  "packageInfo": {
    "weight": 2.5,
    "dimensions": { "length": 30, "width": 20, "height": 15 },
    "description": "Elektronika buyumlari",
    "value": 2500000
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "trackingNumber": "EX24123456789UZ",
    "provider": "EXPRESS24",
    "status": "created",
    "estimatedDelivery": "2024-01-18",
    "cost": 35000,
    "trackingUrl": "https://express24.uz/track/EX24123456789UZ"
  }
}
```

### 3. Yetkazib Berish Holatini Kuzatish

```http
GET /api/v1/shipping/track/{trackingNumber}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "trackingNumber": "EX24123456789UZ",
    "provider": "EXPRESS24",
    "status": "in_transit",
    "statusText_uz": "Yo'lda",
    "statusText_ru": "В пути",
    "statusText_en": "In Transit",
    "currentLocation": "Toshkent sorting center",
    "estimatedDelivery": "2024-01-18",
    "history": [
      {
        "timestamp": "2024-01-15T09:00:00Z",
        "status": "created",
        "location": "Toshkent warehouse",
        "description_uz": "Buyurtma qabul qilindi"
      },
      {
        "timestamp": "2024-01-15T14:30:00Z",
        "status": "picked_up",
        "location": "Toshkent sorting center",
        "description_uz": "Saralash markaziga yetkazildi"
      }
    ]
  }
}
```

---

## Telefon Validatsiya API

### 1. O'zbek Telefon Raqamini Validatsiya

```http
POST /api/v1/validation/phone
```

**Request Body:**

```json
{
  "phone": "+998901234567",
  "country": "UZ"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "isValid": true,
    "formattedPhone": "+998 90 123 45 67",
    "operator": {
      "code": "UCELL",
      "name_uz": "Ucell",
      "name_ru": "Ucell"
    },
    "region": "Toshkent"
  }
}
```

### 2. SMS Yuborish (Eskiz.uz)

```http
POST /api/v1/notifications/sms/send
```

**Request Body:**

```json
{
  "phone": "+998901234567",
  "message": "Buyurtmangiz qabul qilindi. Raqam: UZ1734567890123",
  "type": "order_confirmation"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "messageId": "eskiz_msg_123456",
    "provider": "ESKIZ",
    "status": "sent",
    "cost": 150, // UZS
    "deliveryStatus": "delivered"
  }
}
```

---

## Buyurtma API (O'zbekiston uchun)

### 1. Buyurtma Yaratish

```http
POST /api/v1/orders
```

**Request Body:**

```json
{
  "items": [
    {
      "productId": "product123",
      "quantity": 2,
      "price": 150000
    }
  ],
  "paymentMethod": "CLICK", // "CLICK", "PAYME", "UZCARD", "HUMO", "CASH_ON_DELIVERY"
  "deliveryAddress": {
    "type": "HOME",
    "region": "Toshkent shahri",
    "district": "Chilonzor",
    "mahalla": "Katartal",
    "street": "Bunyodkor ko'chasi",
    "house": "5",
    "apartment": "12",
    "postalCode": "100000",
    "deliveryInstructions": "Qo'ng'iroq qiling"
  },
  "deliveryProvider": "EXPRESS24",
  "currency": "UZS",
  "language": "uz"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "UZ1734567890123",
    "status": "pending",
    "items": [...],
    "subtotal": 300000,
    "taxRate": 0.12,
    "taxAmount": 36000,
    "deliveryFee": 25000,
    "total": 361000,
    "currency": "UZS",
    "paymentMethod": "CLICK",
    "deliveryAddress": {...},
    "estimatedDelivery": "2024-01-18",
    "createdAt": "2024-01-15T10:30:00+05:00", // Toshkent vaqti
    "paymentUrl": "https://my.click.uz/services/pay?..."
  }
}
```

### 2. Buyurtma Holatini Ko'rish

```http
GET /api/v1/orders/{orderId}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "UZ1734567890123",
    "status": "confirmed",
    "statusText_uz": "Tasdiqlangan",
    "statusText_ru": "Подтвержден",
    "statusText_en": "Confirmed",
    "paymentStatus": "paid",
    "trackingNumber": "EX24123456789UZ",
    "estimatedDelivery": "2024-01-18",
    "actualDelivery": null,
    "total": 361000,
    "currency": "UZS",
    "timeline": [
      {
        "timestamp": "2024-01-15T10:30:00+05:00",
        "status": "created",
        "description_uz": "Buyurtma yaratildi"
      },
      {
        "timestamp": "2024-01-15T10:35:00+05:00",
        "status": "payment_confirmed",
        "description_uz": "To'lov tasdiqlandi"
      }
    ]
  }
}
```

---

## Lokalizatsiya API

### 1. Til O'zgartirish

```http
GET /api/v1/config/localization
```

**Query Parameters:**

- `lang`: uz, ru, en

**Response:**

```json
{
  "success": true,
  "data": {
    "language": "uz",
    "translations": {
      "welcomeMessage": "Xush kelibsiz",
      "cart": "Savat",
      "checkout": "To'lov",
      "orderConfirmed": "Buyurtma tasdiqlandi",
      "paymentMethods": {
        "CLICK": "Click to'lov tizimi",
        "PAYME": "Payme to'lov tizimi",
        "UZCARD": "Uzcard bank kartasi",
        "HUMO": "Humo bank kartasi",
        "CASH_ON_DELIVERY": "Yetkazib berganda to'lash"
      },
      "regions": {
        "TSH": "Toshkent shahri",
        "SAM": "Samarqand",
        "BUX": "Buxoro"
      }
    },
    "currency": {
      "code": "UZS",
      "symbol": "so'm",
      "format": "{amount} so'm"
    },
    "dateFormat": "DD.MM.YYYY",
    "timeFormat": "HH:mm",
    "timezone": "Asia/Tashkent"
  }
}
```

### 2. Valyuta Kurslari

```http
GET /api/v1/config/currency-rates
```

**Response:**

```json
{
  "success": true,
  "data": {
    "baseCurrency": "UZS",
    "rates": {
      "USD": 0.000081, // 1 UZS = 0.000081 USD
      "EUR": 0.000074,
      "RUB": 0.0075
    },
    "lastUpdated": "2024-01-15T10:00:00+05:00",
    "source": "CBU" // Central Bank of Uzbekistan
  }
}
```

---

## Mahsulotlar API (O'zbekiston uchun)

### 1. Mahsulotlar Ro'yxati

```http
GET /api/v1/products
```

**Query Parameters:**

- `currency`: UZS (default)
- `lang`: uz, ru, en
- `region`: TSH, SAM, BUX, etc.

**Response:**

```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "product123",
        "name": "iPhone 15 Pro",
        "name_uz": "iPhone 15 Pro",
        "name_ru": "iPhone 15 Pro",
        "description_uz": "Eng so'nggi iPhone modeli",
        "price": 18500000,
        "originalPrice": 19000000,
        "currency": "UZS",
        "formattedPrice": "18 500 000 so'm",
        "formattedOriginalPrice": "19 000 000 so'm",
        "discount": 2.6,
        "taxIncluded": true,
        "availability": {
          "inStock": true,
          "quantity": 15,
          "regions": ["TSH", "SAM", "BUX"]
        },
        "shipping": {
          "freeShipping": true,
          "estimatedDays": 2
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

---

## Analytics API

### 1. Buyurtmalar Statistikasi

```http
GET /api/v1/analytics/orders
```

**Query Parameters:**

- `period`: day, week, month, year
- `region`: TSH, SAM, BUX, etc.

**Response:**

```json
{
  "success": true,
  "data": {
    "period": "month",
    "region": "TSH",
    "stats": {
      "totalOrders": 1250,
      "totalRevenue": 125000000, // UZS
      "averageOrderValue": 100000,
      "currency": "UZS",
      "topPaymentMethods": [
        { "method": "CASH_ON_DELIVERY", "percentage": 45 },
        { "method": "CLICK", "percentage": 25 },
        { "method": "PAYME", "percentage": 20 },
        { "method": "UZCARD", "percentage": 10 }
      ],
      "topRegions": [
        { "region": "Toshkent shahri", "orders": 500 },
        { "region": "Samarqand", "orders": 200 },
        { "region": "Buxoro", "orders": 150 }
      ]
    }
  }
}
```

---

## Xato Kodlari

### O'zbekiston-spetsifik Xato Kodlari

| Kod                             | Xato                           | Tavsif                                        |
| ------------------------------- | ------------------------------ | --------------------------------------------- |
| `UZ_PHONE_INVALID`              | Noto'g'ri telefon raqami       | O'zbek telefon raqami formati noto'g'ri       |
| `UZ_REGION_NOT_SUPPORTED`       | Viloyat qo'llab-quvvatlanmaydi | Belgilangan viloyatga yetkazib berish yo'q    |
| `UZ_PAYMENT_METHOD_UNAVAILABLE` | To'lov usuli mavjud emas       | Tanlangan to'lov usuli vaqtincha ishlamayapti |
| `UZ_POSTAL_CODE_INVALID`        | Pochta kodi noto'g'ri          | Pochta kodi va viloyat mos kelmaydi           |
| `UZ_DELIVERY_NOT_AVAILABLE`     | Yetkazib berish mavjud emas    | Ushbu hududga yetkazib berish xizmati yo'q    |

### Umumiy Xato Formati

```json
{
  "success": false,
  "error": {
    "code": "UZ_PHONE_INVALID",
    "message": "Noto'g'ri telefon raqami",
    "message_en": "Invalid phone number",
    "message_ru": "Неверный номер телефона",
    "details": {
      "field": "phone",
      "expected": "+998XXXXXXXXX"
    }
  }
}
```

---

## Rate Limiting

- **Umumiy API**: 1000 so'rov/soat
- **To'lov API**: 100 so'rov/soat
- **SMS API**: 50 so'rov/soat
- **Webhook**: Cheklovsiz

---

## SDK va Kod Namunalari

### JavaScript/Node.js

```javascript
const UltraMarketUZ = require('@ultramarket/sdk-uzbekistan');

const client = new UltraMarketUZ({
  apiKey: 'your_api_key',
  environment: 'production', // yoki 'development'
  language: 'uz',
});

// Buyurtma yaratish
const order = await client.orders.create({
  items: [{ productId: 'product123', quantity: 2 }],
  paymentMethod: 'CLICK',
  deliveryAddress: {
    region: 'Toshkent shahri',
    district: 'Yashnobod',
    street: "Mustaqillik ko'chasi",
    house: '15',
  },
});

// Click to'lovini boshlash
const payment = await client.payments.click.create({
  orderId: order.id,
  amount: order.total,
  returnUrl: 'https://yoursite.uz/success',
});
```

### PHP

```php
<?php
use UltraMarket\UzbekistanSDK\Client;

$client = new Client([
    'api_key' => 'your_api_key',
    'environment' => 'production',
    'language' => 'uz'
]);

// Telefon validatsiya
$phone = $client->validation->phone('+998901234567');
if ($phone->isValid()) {
    echo "Telefon raqami to'g'ri: " . $phone->getFormattedPhone();
}

// Yetkazib berish narxi
$shipping = $client->shipping->calculate([
    'provider' => 'EXPRESS24',
    'from_region' => 'Toshkent shahri',
    'to_region' => 'Samarqand',
    'weight' => 2.5
]);

echo "Yetkazib berish narxi: " . $shipping->getCost() . " so'm";
?>
```

---

## Test Muhiti

### Test API URL

```
https://test-api.ultramarket.uz
```

### Test Ma'lumotlari

**Test Click Merchant ID:** `test_click_12345`
**Test Payme Merchant ID:** `test_payme_67890`

**Test Telefon Raqamlari:**

- `+998901234567` - Muvaffaqiyatli
- `+998901234568` - Xato
- `+998901234569` - Timeout

**Test Bank Kartalari:**

- `8600123456781234` - Muvaffaqiyatli Uzcard
- `9860123456781234` - Muvaffaqiyatli Humo
- `8600123456781235` - Rad etilgan

---

## Qo'llab-quvvatlash

- **Texnik yordam**: support@ultramarket.uz
- **Telegram**: @UltraMarketSupport
- **Telefon**: +998 71 123-45-67
- **Dokumentatsiya**: https://docs.ultramarket.uz
- **GitHub**: https://github.com/ultramarket/api-uzbekistan

---

_Dokumentatsiya oxirgi marta 2024-yil 15-yanvarda yangilangan._
