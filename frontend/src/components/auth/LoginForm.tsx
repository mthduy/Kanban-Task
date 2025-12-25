import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '../ui/label';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuthStore } from '@/stores/useAuthStore';
import { useNavigate, useLocation } from 'react-router-dom';

const loginSchema = z.object({
  username: z.string().min(3, 'Tên đăng nhập ít nhất phải có 3 ký tự'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
});

type LoginFormValue = z.infer<typeof loginSchema>;

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValue>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValue) => {
    const { username, password } = data;
    await login(username, password);
    // If redirected here (AcceptPage saved state.from), return there; otherwise go home
    const state = location.state as { from?: { pathname?: string } } | undefined;
    const to = state?.from?.pathname || '/';
    navigate(to);
  };

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card className="overflow-hidden p-0 border-border">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-6">
              {/*header - logon*/}
              <div className="flex flex-col items-center text-center gap-2">
                <a className="mx-auto block w-fit text-center" href="/">
                  <img
                    src="./kanban.png"
                    alt="logo"
                    className="w-[100px] h-auto"
                  />
                </a>
                <h1 className="text-xl font-bold">
                  KanbanX chào mừng bạn quay trở lại
                </h1>
                <p className="text-muted-foreground text-balance">
                  Đăng nhập vào tài khoản KanbanX của bạn
                </p>
              </div>
              {/*họ và tên*/}

              {/*username*/}
              <div className="flex flex-col gap-3">
                <Label htmlFor="username" className="block text-sm">
                  Tên đăng nhập
                </Label>
                <Input
                  type="text"
                  id="username"
                  placeholder="kanbanX"
                  {...register('username')}
                />
                {errors.username && (
                  <p className="text-destructive test-sm">
                    {errors.username.message}
                  </p>
                )}
              </div>

              {/*email*/}

              {/* password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="block text-sm">
                  Mật khẩu
                </Label>
                <Input
                  type="password"
                  id="password"
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-destructive test-sm">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/*nút đăng nhập*/}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                Đăng nhập
              </Button>

              <div className="text-center text-sm ">
                Bạn chưa có tải khoản?{' '}
                <a href="/register" className="underline underline-offset-4">
                  Đăng ký
                </a>
              </div>
            </div>
          </form>
          <div className="bg-muted relative hidden md:block">
            <img
              src="/login.png"
              alt="Image"
              className="absolute top-1/2 -translate-y-1/2 object-cover"
            />
          </div>
        </CardContent>
      </Card>
      <div className="px-6 text-center text-balance *:[a]:hover:text-primary text-muted-foreground *:[a]:underline *:[a]:underline-offetset-4">
        Bằng cách nhấn <strong>Tiếp tục</strong>, bạn đồng ý với{' '}
        <a href="#">Điều khoản dịch vụ</a> và <a href="#">Chính sách bảo mật</a>{' '}
        của chúng tôi.
      </div>
    </div>
  );
}
