export default function handler(req: any, res: any) {
  return res.status(200).json({
    status: "ok",
    service: "fidesave",
    environment: "vercel-serverless",
    timestamp: new Date().toISOString()
  });
}
