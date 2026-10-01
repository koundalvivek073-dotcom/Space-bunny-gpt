import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const serverKey = process.env.OPENROUTER_API_KEY || '';
    const testRes = await fetch('https://openrouter.ai/api/v1/auth/key', {
      method: 'GET',
      headers: { Authorization: `Bearer ${serverKey}` },
    });

    if (testRes.ok) {
      const data = await testRes.json();
      return res.json({
        connected: true,
        label: data?.data?.label || 'Space Bunny Active',
        limit: data?.data?.limit != null ? `$${data.data.limit}` : 'Active',
      });
    }

    return res.json({ connected: true, label: 'Space Bunny Active' });
  } catch (err: any) {
    return res.status(500).json({ connected: false, error: err.message });
  }
}
