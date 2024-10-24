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
  const { lagCondition } = req.query; // 쿼리 파라미터로 lagCondition 받기
  let allResults = []; // 모든 결과를 저장할 배열
  let hasMore = true; // 더 가져올 데이터가 있는지 여부
  let startCursor = undefined; // 커서 초기값 설정
  const limit = 20; // 기본 가져올 데이터 수

  try {
    while (hasMore) {
      let queryData = {
        start_cursor: startCursor, // 이전 쿼리에서 받은 커서 사용
        page_size: limit, // 기본 limit 설정
      };

      if (lagCondition === '1') {
        // lag 1일 때 쿼리 필터 설정
        queryData.filter = {
          property: 'lag',
          rich_text: {
            equals: '1',
          },
        };
      } else if (lagCondition === '2') {
        // lag 2일 때 쿼리 필터 설정
        queryData.filter = {
          property: 'lag',
          rich_text: {
            equals: '2',
          },
        };

      } else {
        // lag에 상관없이 가져올 경우
        queryData.page_size = 40; // 40개 가져오기
      }

      const response = await axios.post(
        `https://api.notion.com/v1/databases/${process.env.NOTION_DATABASE_ID}/query`,
        queryData,
        {
          headers: {
            Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
            "Content-Type": "application/json",
            "Notion-Version": "2022-06-28",
          },
        }
      );

      allResults = allResults.concat(response.data.results); // 결과 추가
      hasMore = response.data.has_more; // 더 가져올 데이터가 있는지 확인
      startCursor = response.data.next_cursor; // 다음 커서 업데이트

      // 만약 lagCondition이 1이나 2일 경우 각각 20개만 가져와야 하므로
      if (lagCondition === '1' && allResults.length >= 20) {
        allResults = allResults.slice(0, 20);
        break;
      }
      if (lagCondition === '2' && allResults.length >= 20) {
        allResults = allResults.slice(0, 20);
        break;
      }
      if (lagCondition === 'none' && allResults.length >= 40) {
        allResults = allResults.slice(0, 40);
        break;
      }
    }

    res.json(allResults); // 최종 결과 반환
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