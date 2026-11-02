import { useState } from 'react';
import { Award, Share2, ShoppingBag, ArrowUpRight } from 'lucide-react';
import Button from './Button';
import { getHardwareRoute } from '../data/hardwareRoutes';

export default function Graduation({ routeId = 'classic', onShop, onOverview }) {
  const route = getHardwareRoute(routeId);
  const [feedback, setFeedback] = useState('');
  async function share() {
    // 生成可保存的作品卡，不分享本机 localhost 地址，也不会自动发布到社交平台。
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" rx="40" fill="#f6f1e7"/><rect x="32" y="32" width="1136" height="736" rx="28" fill="none" stroke="#ba9457"/><g text-anchor="middle" font-family="sans-serif" fill="#203a36"><text x="600" y="150" font-size="26">SparkMate · 我的第一次创造</text><text x="600" y="290" font-size="64">你好，桌宠创造者。</text><text x="600" y="400" font-size="28">我完成了虚拟电源接线与代码调参</text><text x="600" y="470" font-size="26">从零开始，也能让好奇发光。</text><text x="600" y="660" font-size="18">虚拟创作体验纪念 · 非学历或职业资格证明</text></g></svg>';
    const routeSvg = svg
      .replace('SparkMate · 我的第一次创造', `SparkMate · ${route.name}`)
      .replace('我完成了虚拟电源接线与代码调参', '我完成了示意连线与共享表情调参');
    const file = new File([routeSvg], 'SparkMate-我的作品.svg', { type: 'image/svg+xml' });
    try {
      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({
          title: '我的 SparkMate 作品',
          text: '从零开始，我完成了虚拟接线与桌宠调参！',
          files: [file],
        });
        setFeedback('作品卡已交给系统分享。');
      } else {
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setFeedback('作品卡已下载，可以发送给你的朋友。');
      }
    } catch (error) {
      setFeedback(
        error.name === 'AbortError' ? '已取消分享，作品依然属于你。' : '暂时无法分享，请稍后重试。',
      );
    }
  }
  return (
    <>
      <div className="certificate">
        <span className="certificate-kicker">SPARKMATE · 创作纪念</span>
        <Award size={52} />
        <span className="certificate-tag">{route.name} · 体验课程毕业证书</span>
        <h2 id="modal-title">你好，桌宠创造者。</h2>
        <p>颁给勇敢迈出第一步的你</p>
        <div className="certificate-rule" />
        <p>
          你已完成本路线示意连线与共享表情调参，
          <br />
          让自己的第一个小伙伴有了表情。
        </p>
        <b>把「我不会」，变成「我做到了」。</b>
        <small>学习体验纪念，非学历或职业资格证明</small>
      </div>
      <div className="graduation-actions">
        <Button className="btn primary full" onClick={share}>
          <Share2 size={17} />
          分享我的作品
        </Button>
        <Button className="btn full" onClick={onShop}>
          <ShoppingBag size={17} />
          前往商城获取实体套件
        </Button>
        <Button className="text-button" onClick={onOverview}>
          查看我的成就 <ArrowUpRight size={15} />
        </Button>
      </div>
      <p role="status" className="share-feedback">
        {feedback}
      </p>
    </>
  );
}
