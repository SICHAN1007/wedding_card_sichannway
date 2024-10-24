const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = 3000;

app.use(cors({
    origin: ['https://www.tokkitokki.kr', 'https://oopy.io', 'https://app.oopy.io','https://notion2.oopy.io'], // 허용할 도메인 배열
}));
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
  const offset = parseInt(req.query.offset) || 0; // 쿼리에서 오프셋 가져오기
  const limit = 10; // 가져올 데이터 수

  const filter = {
    filter: {
      property: 'lag',
      rich_text: {
        equals: '1', // 원하는 조건 설정
      },
    },
    start: offset, // 오프셋 적용
    page_size: limit, // 페이지 사이즈 설정
  };

  try {
    const response = await axios.post(
      `https://api.notion.com/v1/databases/${process.env.NOTION_DATABASE_ID}/query`,
      filter,
      {
        headers: {
          Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28",
        },
      }
    );
    res.json(response.data);
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
  const { id } = req.params;
  const password = req.headers["authorization"];

  try {
    const response = await axios.get(`https://api.notion.com/v1/pages/${id}`, {
      headers: {
        Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
        "Notion-Version": "2022-06-28",
      },
    });

    const notionPw = response.data.properties.PW.rich_text[0]?.text?.content;

    if (password === notionPw) {
      const updateResponse = await axios.patch(
        `https://api.notion.com/v1/pages/${id}`,
        req.body,
        {
          headers: {
            Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
            "Content-Type": "application/json",
            "Notion-Version": "2022-06-28",
          },
        }
      );
      res.json(updateResponse.data);
    } else {
      res.status(401).json({ error: "비밀번호가 일치하지 않습니다." });
    }
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
    const response = await axios.get(`https://api.notion.com/v1/pages/${id}`, {
      headers: {
        Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
        "Notion-Version": "2022-06-28",
      },
    });

    const notionPw = response.data.properties.PW.rich_text[0]?.text?.content;

    if (password === notionPw) {
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
    } else {
      res.status(401).json({ error: "비밀번호가 일치하지 않습니다." });
    }
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