const thongbao = document.getElementById("thongbao");
    const nutOK = document.getElementById("thongbao-nut");
    const audio = document.getElementById("audio");
    const loading = document.getElementById("loading");
    
    nutOK.addEventListener("click", () => {
      thongbao.style.display = "none";
      audio.play();
      loading.style.display = "none"; /* Ẩn loading khi bấm OK */
    });