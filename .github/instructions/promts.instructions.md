# 🧠 Frontend Project Instruction (Mini)

## 🎯 Goal
- โค้ดอ่านง่าย
- แยก responsibility ชัด
- scale ต่อได้ในอนาคต

---

## 📁 Project Structure

src/
├── components/   # UI
├── hooks/        # logic + state
├── services/     # API call
├── types/        # shared types
├── config/       # constants / env
├── utils/        # helper functions

---

## 🧩 Components

- ใช้สำหรับ UI เท่านั้น
- รับ props แล้ว render
- ❌ ห้ามมี logic เยอะ
- ❌ ห้ามเรียก API โดยตรง

---

## 🪝 Hooks

- ใช้เก็บ logic / state
- reusable ได้
- ชื่อขึ้นต้นด้วย `use`

---

## 🌐 Services

- รวม API call ทั้งหมด
- ห้ามเรียก API ใน component

---

## 🧠 State (Store)

- ใช้เฉพาะ global state เท่านั้น (ถ้าจำเป็น)
- เช่น user, theme

---

## 🧾 Naming Convention

- Component → PascalCase
- Hook → useSomething
- Constant → UPPER_SNAKE_CASE

---

## 📦 Import Rule

- ใช้ alias `@/`
- ❌ ห้ามใช้ ../../

---

## 🔄 Data Flow

- Props → ลง (parent → child)
- Event → ขึ้น (child → parent)

---

## 🚦 Error Handling

- API error → แสดง alert / toast
- ห้ามปล่อย error เงียบ

---

## 🎯 UX Basic

- ทุก API ต้องมี loading state
- ทุก action ต้องมี feedback

---

## 📱 Responsive

- UI ต้องรองรับอย่างน้อยตั้งแต่ tablet ขึ้นไป
- layout ต้องใช้งานได้บน tablet, laptop, desktop
- หลีกเลี่ยง fixed width/height ที่ทำให้ layout พัง
- ออกแบบ responsive ตั้งแต่แรก ไม่ค่อยมาแก้ตอนท้าย

---

## 🔁 Reusability Rule

- ใช้ซ้ำ ≥ 2 ที่ → แยกเป็น hook หรือ component

---

## 🚫 Anti-pattern (ห้ามทำ)

- component ยิง API เอง
- logic ยาวใน component
- copy type ซ้ำหลายที่
- state กระจัดกระจาย

---

## 🧪 (Optional)

- component สำคัญควรมี test
- test อย่างน้อย:
  - render
  - interaction (click / input)

---

## 🔥 Summary

- component = UI
- hook = logic
- service = API
- แยกให้ชัด = โค้ดไม่พัง