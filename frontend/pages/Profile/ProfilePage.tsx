import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/useAuthStore";
import { authService } from "@/services/authService";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { User, Mail, Phone, Image, LogOut } from "lucide-react";
import { useTranslation } from 'react-i18next';

const ProfilePage = () => {
  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const logout= useAuthStore((s)=> s.logout)
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState<string>(user?.displayName || "");
  const [email, setEmail] = useState<string>(user?.email || "");
  const [phone, setPhone] = useState<string>(user?.phone || "");
  const [avatarUrl, setAvatarUrl] = useState<string>(user?.avatarUrl || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    setDisplayName(user?.displayName || "");
    setEmail(user?.email || "");
    setPhone(user?.phone || "");
    setAvatarUrl(user?.avatarUrl || "");
  }, [user]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        try {
          URL.revokeObjectURL(previewUrl);
        } catch {
          // ignore invalid URL errors
        }
      }
    };
  }, [previewUrl]);

  const onSubmit = async () => {
    setLoading(true);
    try {
      if (avatarFile) {
        await authService.uploadAvatar(avatarFile);
        await fetchMe();
      } else {
        await authService.updateProfile({ displayName, email, phone, avatarUrl });
        await fetchMe();
      }
      toast.success("Cập nhật hồ sơ thành công");
      navigate("/");
    } catch (err) {
      console.error(err);
      toast.error("Cập nhật hồ sơ thất bại");
    } finally {
      setLoading(false);
    }
  };

  const onCancel = () => {
    setDisplayName(user?.displayName || "");
    setEmail(user?.email || "");
    setPhone(user?.phone || "");
    setAvatarUrl(user?.avatarUrl || "");
    navigate(-1);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setAvatarUrl(url);
  };

 

  const handleLogout= async () => {
    try{
      await logout(); 
      toast.success("Đăng xuất thành công!"); 
      navigate("/login"); 

    }catch(err){
      console.error("Lỗi: ",err); 
      toast.error("Đăng xuất thất bại!")
    }
  }
  return (
    <div className="min-h-screen bg-gradient-purple p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8 message-bounce">
          <h1 className="text-3xl sm:text-4xl text-center font-bold text-foreground mb-2">
            {t('profile.title')}
          </h1>
          <p className="text-muted-foreground text-center">{t('profile.subtitle')}</p>
        </div>

        {/* Main Card */}
        <Card className="glass-strong shadow-soft border-0 message-bounce" style={{ animationDelay: '0.1s' }}>
          <CardContent className="p-6 sm:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Avatar Section */}
              <div className="flex flex-col items-center space-y-6">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-primary rounded-full opacity-60 group-hover:opacity-100 blur-md transition-all duration-300 shadow-glow"></div>
                  <Avatar className="relative w-40 h-40 ring-4 ring-primary/20 shadow-soft transition-transform duration-300 group-hover:scale-105">
                    {avatarUrl ? (
                      <img 
                        src={avatarUrl} 
                        alt={displayName || user?.username} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <AvatarFallback className="text-3xl bg-gradient-chat text-primary-foreground font-semibold">
                          {(() => {
                            const name = typeof user?.username === 'string' && user?.username ? user.username : 'U';
                            return String(name[0] || 'U').toUpperCase();
                          })()}
                        </AvatarFallback>
                    )}
                  </Avatar>
                </div>

                <div className="w-full space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Image className="w-4 h-4 text-primary" />
                    {t('profile.avatar')}
                  </label>
                  <div className="relative">
                    <Input
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="Nhập URL ảnh hoặc chọn file"
                      className="transition-all duration-200 focus:ring-2 focus:ring-primary/30"
                    />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={onFileChange}
                      className="mt-2 w-full text-sm"
                    />
                  </div>
                </div>

                <div className="w-full p-4 glass rounded-xl border shadow-soft">
                  <p className="text-sm text-muted-foreground text-center">
                    <span className="font-medium text-foreground">Username:</span>
                    <br />
                    <span className="text-primary font-semibold text-base">@{user?.username}</span>
                  </p>
                </div>
              </div>

              {/* Form Section */}
              <div className="lg:col-span-2 space-y-6">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <User className="w-4 h-4 text-primary" />
                    {t('profile.displayName')}
                  </label>
                  <Input 
                    value={displayName} 
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Nhập tên hiển thị"
                    className="text-base transition-all duration-200 focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Mail className="w-4 h-4 text-primary" />
                    Email
                  </label>
                  <Input 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    type="email"
                    className="text-base transition-all duration-200 focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Phone className="w-4 h-4 text-primary" />
                    {t('profile.phone')}
                  </label>
                  <Input 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0123 456 789"
                    className="text-base transition-all duration-200 focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-border">
                  <Button 
                    type="button" 
                    onClick={onSubmit} 
                    disabled={loading}
                    className="flex-1 bg-gradient-chat hover:opacity-90 text-primary-foreground font-medium py-6 rounded-xl shadow-soft hover:shadow-glow transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Đang lưu...
                      </span>
                    ) : (
                      <span>{t('profile.saveChanges')}</span>
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={onCancel}
                    className="flex-1 sm:flex-initial glass border-2 hover:bg-muted/50 font-medium py-6 rounded-xl transition-all duration-200"
                  >
                    {t('profile.cancel')}
                  </Button>
                </div>
                  <div className="pt-4 border-t border-border">
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleLogout}
                      className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-6 rounded-xl shadow-soft hover:shadow-glow transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      <LogOut className="w-5 h-5" />
                      {t('profile.logout')}
                    </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;