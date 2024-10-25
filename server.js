const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// 환경 변수 확인
if (!process.env.NOTION_DATABASE_ID || !process.env.NOTION_API_KEY) {
  console.error("환경 변수가 설정되어 있지 않습니다.");
  process.exit(1);
}

// POST 요청으로 데이터 추가
app.post("/proxy", async (req, res) => {
  const { name, title, pw, date } = req.body;

  const newData = {
    parent: { database_id: process.env.NOTION_DATABASE_ID },
    properties: {
      Name: {
        rich_text: [{ text: { content: name } }],
      },
      Title: {
        title: [{ text: { content: title } }],
      },
      PW: {
        rich_text: [
          {
            text: {
              content: pw,
            },
          },
        ],
      },
      DATE: {
        date: {
          start: date,
        },
      },
    },
  };

  try {
    const response = await axios.post(
      "https://api.notion.com/v1/pages",
      newData,
      {
        headers: {
          Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28",
        },
      }
    );
    res.status(response.status).json({ message: "데이터 추가 성공" });
  } catch (error) {
    console.error(
      "Notion API 요청 중 오류 발생:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "서버 오류" });
  }
});

// GET 요청으로 데이터 가져오기
app.get("/proxy", async (req, res) => {
  try {
    const response = await axios.post(
      `https://api.notion.com/v1/databases/${process.env.NOTION_DATABASE_ID}/query`,
      {
        page_size: 40, // 최대 40개까지 가져오기
        sorts: [
          {
            property: "DATE", // 날짜 기준으로 정렬 (필드 이름을 적절히 수정)
            direction: "descending", // 최신 순으로 정렬
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28",
        },
      }
    );
    res.json(response.data.results); // 중복된 데이터를 피하기 위해 results만 반환
  } catch (error) {
    console.error(
      "Notion API에서 데이터 가져오기 오류:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Notion API에서 데이터 가져오기 실패" });
  }
});


// PATCH 요청으로 데이터 수정
app.patch("/proxy/:id", async (req, res) => {
  const { id, name, title, pw } = req.body;
  
  const updateData = {
    parent: { database_id: process.env.NOTION_DATABASE_ID },
    properties: {
      Name: {
        rich_text: [{ text: { content: name } }],
      },
      Title: {
        title: [{ text: { content: title } }],
      },
    },
  };

  try {

      const updateResponse = await axios.patch(
        `https://api.notion.com/v1/pages/${id}`,
        updateData,
        {
          headers: {
            Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
            "Content-Type": "application/json",
            "Notion-Version": "2022-06-28",
          },
        }
      );
      res.json(updateResponse.data);
    
  } catch (error) {
    console.error(
      "Notion API에서 데이터 수정 오류:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Notion API에서 데이터 수정 실패" });
  }
});

// DELETE 요청으로 데이터 삭제
app.delete("/proxy/:id", async (req, res) => {
  const { id } = req.params;
  const password = req.headers["authorization"];

  try {
    const deleteResponse = await axios.delete(
        `https://api.notion.com/v1/blocks/${id}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
            "Notion-Version": "2022-06-28",
          },
        }
      );
      res.json({ message: "데이터 삭제 성공", data: deleteResponse.data });
    
  } catch (error) {
    console.error(
      "Notion API에서 데이터 삭제 오류:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Notion API에서 데이터 삭제 실패" });
  }
});

app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});