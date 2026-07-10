# AI-Sales-Analysis-
Interactive Dashboard for analyzing sales data 
# 📊 Dashboard Generator .3 - Instant Excel Analytics

An automated, smart web dashboard application that transforms raw Excel sheets into interactive analytical visualizations in a single click. No manual configuration, no complex setup—just upload and gain instant insights.

## ✨ Core Features
* **Smart Column Auto-Detection:** Automatically identifies category columns (like Order ID/Product) and numerical value columns (like Quantity/Sales) from your uploaded Excel sheet.
* **Instant KPI Cards Generation:** Dynamically calculates and displays critical executive metrics:
  * Total Sum (إجمالي القيمة الحسابية)
  * Row Averages (متوسط قيم الصفوف)
  * Peak Values (أعلى قيمة مسجلة)
* **Automated Data Visualizations:** Instantly builds rich, fully responsive, and interactive charts:
  * **Bar Chart:** Category breakdown and item comparison.
  * **Line Chart:** Performance trend monitoring and time-series tracking.
  * **Pie Chart:** Market shares and distribution percentages.

## 🚀 How It Works
1. **Upload:** Select your standard Excel dataset (`.xlsx`, `.xls`).
2. **Process:** Click **"توليد لوحة التحكم تلقائياً"** (Generate Dashboard Automatically).
3. **Explore:** Analyze your interactive charts, filter metrics, and extract business intelligence on the fly.

## 🛠️ Tech Stack
* **Backend:** Python, FastAPI, Pandas, OpenPyXL
* **Frontend:** HTML5, CSS3 (Modern Dark Theme UI), JavaScript, Chart.js

## 💻 Quick Start
To run the project locally, execute the following commands in your terminal:

```bash
# 1. Install required libraries
pip install fastapi uvicorn pandas openpyxl python-multipart

# 2. Run the server
python -m uvicorn main:app --reload
