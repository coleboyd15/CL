using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class MagentaKey
{
    public static int Main(string[] args)
    {
        if (args.Length < 2)
        {
            Console.WriteLine("usage: MagentaKey src dst");
            return 1;
        }
        Run(args[0], args[1]);
        return 0;
    }

    public static void Run(string src, string dst)
    {
        using (Bitmap loaded = new Bitmap(src))
        using (Bitmap bmp = new Bitmap(loaded.Width, loaded.Height, PixelFormat.Format32bppArgb))
        {
            using (Graphics g = Graphics.FromImage(bmp))
            {
                g.DrawImage(loaded, 0, 0, loaded.Width, loaded.Height);
            }

            int w = bmp.Width;
            int h = bmp.Height;
            BitmapData data = bmp.LockBits(
                new Rectangle(0, 0, w, h),
                ImageLockMode.ReadWrite,
                PixelFormat.Format32bppArgb
            );
            int stride = data.Stride;
            int bytes = Math.Abs(stride) * h;
            byte[] px = new byte[bytes];
            Marshal.Copy(data.Scan0, px, 0, bytes);

            for (int y = 0; y < h; y++)
            {
                int row = y * stride;
                for (int x = 0; x < w; x++)
                {
                    int i = row + x * 4;
                    byte b = px[i];
                    byte g = px[i + 1];
                    byte r = px[i + 2];
                    int hue = Hue(r, g, b);
                    int max = Math.Max(r, Math.Max(g, b));
                    int min = Math.Min(r, Math.Min(g, b));
                    float sat = max == 0 ? 0f : (max - min) / (float)max;
                    float val = max / 255f;

                    bool goldHair = hue >= 18 && hue <= 75 && sat > 0.22f && val > 0.30f;
                    bool blackLine = max < 55;
                    bool grayBird = sat < 0.22f && val < 0.92f && val > 0.12f;
                    bool brownFur = hue >= 10 && hue <= 45 && sat > 0.15f && val < 0.75f;
                    bool coralFoot = (hue <= 25 || hue >= 350) && sat > 0.18f && sat < 0.75f && b < 190 && val < 0.85f;
                    bool keep = goldHair || blackLine || grayBird || brownFur || coralFoot;

                    bool magentaHue = hue >= 270 && hue <= 345;
                    bool pinkRgb = r > 175 && b > 135 && g < 170 && (r - g) > 40;
                    bool bg = !keep && ((magentaHue && sat > 0.20f && val > 0.40f) || (pinkRgb && sat > 0.25f));

                    byte a = 255;
                    if (bg)
                    {
                        a = 0;
                    }
                    else if (!keep && magentaHue && sat > 0.12f)
                    {
                        float t = (sat - 0.12f) / 0.20f;
                        if (t > 1f) t = 1f;
                        if (t < 0f) t = 0f;
                        a = (byte)(255 * (1f - t));
                    }

                    px[i + 3] = a;
                    if (a == 0)
                    {
                        px[i] = 0;
                        px[i + 1] = 0;
                        px[i + 2] = 0;
                    }
                }
            }

            Marshal.Copy(px, 0, data.Scan0, bytes);
            bmp.UnlockBits(data);

            int minX = w, minY = h, maxX = 0, maxY = 0;
            for (int y = 0; y < h; y++)
            {
                int row = y * stride;
                for (int x = 0; x < w; x++)
                {
                    if (px[row + x * 4 + 3] > 12)
                    {
                        if (x < minX) minX = x;
                        if (y < minY) minY = y;
                        if (x > maxX) maxX = x;
                        if (y > maxY) maxY = y;
                    }
                }
            }
            int pad = Math.Max(8, (int)(Math.Max(maxX - minX, maxY - minY) * 0.06));
            minX = Math.Max(0, minX - pad);
            minY = Math.Max(0, minY - pad);
            maxX = Math.Min(w - 1, maxX + pad);
            maxY = Math.Min(h - 1, maxY + pad);
            int cw = maxX - minX + 1;
            int ch = maxY - minY + 1;
            using (Bitmap cropped = bmp.Clone(new Rectangle(minX, minY, cw, ch), PixelFormat.Format32bppArgb))
            {
                int maxW = 360;
                if (cropped.Width > maxW)
                {
                    int nw = maxW;
                    int nh = Math.Max(1, (int)(cropped.Height * (maxW / (float)cropped.Width)));
                    using (Bitmap small = new Bitmap(nw, nh, PixelFormat.Format32bppArgb))
                    {
                        using (Graphics g2 = Graphics.FromImage(small))
                        {
                            g2.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
                            g2.DrawImage(cropped, 0, 0, nw, nh);
                        }
                        small.Save(dst, ImageFormat.Png);
                    }
                }
                else
                {
                    cropped.Save(dst, ImageFormat.Png);
                }
            }
        }
    }

    static int Hue(int r, int g, int b)
    {
        float rf = r / 255f;
        float gf = g / 255f;
        float bf = b / 255f;
        float max = Math.Max(rf, Math.Max(gf, bf));
        float min = Math.Min(rf, Math.Min(gf, bf));
        float d = max - min;
        if (d < 0.0001f) return 0;
        float h;
        if (max == rf) h = ((gf - bf) / d) % 6f;
        else if (max == gf) h = (bf - rf) / d + 2f;
        else h = (rf - gf) / d + 4f;
        h *= 60f;
        if (h < 0) h += 360f;
        return (int)h;
    }
}
