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
  const { cursor1, cursor2 } = req.query; // 각각의 start_cursor (페이징 처리용)
  try {
    // lag가 1인 항목 10개 가져오기
    const queryData1 = {
      page_size: 10,
      filter: {
        property: "lag",
        number: {
          equals: 1,
        },
      },
      sorts: [
        {
          property: "Created Time",
          direction: "descending",
        },
      ],
    };

    // lag가 2인 항목 10개 가져오기
    const queryData2 = {
      page_size: 10,
      filter: {
        property: "lag",
        number: {
          equals: 2,
        },
      },
      sorts: [
        {
          property: "Created Time",
          direction: "descending",
        },
      ],
    };

    // 페이징을 위한 start_cursor가 있으면 추가
    if (cursor1) {
      queryData1.start_cursor = cursor1;
    }
    if (cursor2) {
      queryData2.start_cursor = cursor2;
    }

    // Notion API에 두 번 요청해서 각각 lag 1과 2의 데이터 가져오기
    const [response1, response2] = await Promise.all([
      axios.post(
        `https://api.notion.com/v1/databases/${process.env.NOTION_DATABASE_ID}/query`,
        queryData1,
        {
          headers: {
            Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
            "Content-Type": "application/json",
            "Notion-Version": "2022-06-28",
          },
        }
      ),
      axios.post(
        `https://api.notion.com/v1/databases/${process.env.NOTION_DATABASE_ID}/query`,
        queryData2,
        {
          headers: {
            Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
            "Content-Type": "application/json",
            "Notion-Version": "2022-06-28",
          },
        }
      ),
    ]);

    // lag 1과 lag 2의 데이터를 합쳐서 응답
    res.json({
      results: [...response1.data.results, ...response2.data.results], // 두 응답의 결과 결합
      has_more1: response1.data.has_more, // lag 1의 추가 데이터 여부
      next_cursor1: response1.data.next_cursor, // lag 1의 다음 cursor
      has_more2: response2.data.has_more, // lag 2의 추가 데이터 여부
      next_cursor2: response2.data.next_cursor, // lag 2의 다음 cursor
    });
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