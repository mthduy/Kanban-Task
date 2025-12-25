
const NotFound = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center bg-slate-50"> 
      <img
      src="pagenotfound.png"
      alt="not found"
      className="max-w-full mb-9 w-120"      
      />
    <p className="text-8xl font-semibold">
      NOT FOUND 404
    </p>
    <a href="/" className="inline-block px-6 py-3 mt-6 font-medium text-white transition shadow-md rounded-2xl bg-primary hover:bg-primary-dark" >
      QUAY VỀ TRANG CHỦ 
    </a>
    </div>
    
  )
}

export default NotFound