export default function PaperStatusPage() {
    return (
        <div className="self-stretch p-6 inline-flex flex-col justify-start items-start gap-20">
    <div className="self-stretch flex flex-col justify-start items-center">
        <div className="self-stretch px-4 bg-blue-50 border-b border-gray-300 flex flex-col justify-start items-start gap-10">
            <div className="self-stretch py-6 inline-flex justify-start items-center gap-6">
                <div className="flex-1 justify-center text-gray-900 text-4xl font-bold font-['Plus_Jakarta_Sans'] leading-[54px]">Bài viết mới</div>
            </div>
        </div>
    </div>
    <div className="self-stretch inline-flex justify-center items-center gap-6">
        <div data-size="6xl" className="flex justify-start items-start gap-2.5">
            <div className="w-12 h-12 relative overflow-hidden">
                <div className="w-10 h-10 left-[3px] top-[3.09px] absolute bg-gray-500" />
            </div>
        </div>
        <div className="flex-1 justify-center text-neutral-700 text-4xl font-bold font-['Plus_Jakarta_Sans'] leading-[54px]">Tình trạng bài viết của bạn</div>
    </div>
    <div className="self-stretch bg-blue-50 rounded-lg shadow-[0px_1px_30px_0px_rgba(0,0,0,0.03)] outline outline-1 outline-offset-[-1px] outline-indigo-500 inline-flex justify-start items-center overflow-hidden">
        <div data-property="done" data-type="number" className="flex-1 px-6 py-4 border-b-4 border-indigo-500 flex justify-start items-center gap-6">
            <div data-property="progressing" className="w-8 h-8 inline-flex flex-col justify-center items-center">
                <div className="self-stretch flex-1 bg-indigo-500 rounded-[30px] outline outline-4 outline-indigo-300 flex flex-col justify-center items-center">
                    <div className="text-center justify-start text-white text-xl font-bold font-['Roboto'] leading-7">1</div>
                </div>
            </div>
            <div className="justify-start text-indigo-500 text-xl font-bold font-['Plus_Jakarta_Sans'] leading-8">KHỞI TẠO BÀI VIẾT</div>
        </div>
        <div data-property="done" data-type="arrow" className="h-16 py-4 border-b-4 border-indigo-500 flex justify-start items-center gap-2">
            <div className="flex justify-center items-center">
                <div className="w-6 h-6 relative overflow-hidden">
                    <div className="w-2.5 h-3.5 left-[7.16px] top-[4.50px] absolute bg-indigo-500" />
                </div>
                <div className="w-6 h-6 relative overflow-hidden">
                    <div className="w-2.5 h-3.5 left-[7.16px] top-[4.50px] absolute bg-indigo-500" />
                </div>
                <div className="w-6 h-6 relative overflow-hidden">
                    <div className="w-2.5 h-3.5 left-[7.16px] top-[4.50px] absolute bg-indigo-500" />
                </div>
            </div>
        </div>
        <div data-property="done" data-type="number" className="flex-1 px-6 py-4 bg-indigo-500 border-b-4 border-indigo-500 flex justify-start items-center gap-6">
            <div data-property="progressing" className="w-8 h-8 inline-flex flex-col justify-center items-center">
                <div className="self-stretch flex-1 bg-indigo-50 rounded-[30px] outline outline-4 outline-indigo-300 flex flex-col justify-center items-center">
                    <div className="text-center justify-start text-indigo-500 text-xl font-bold font-['Roboto'] leading-7">2</div>
                </div>
            </div>
            <div className="justify-start text-white text-xl font-bold font-['Plus_Jakarta_Sans'] leading-8">CHỜ XÉT DUYỆT</div>
        </div>
        <div data-property="done" data-type="arrow" className="h-16 py-4 border-b-4 border-gray-300 flex justify-start items-center gap-2">
            <div className="flex justify-center items-center">
                <div className="w-6 h-6 relative overflow-hidden">
                    <div className="w-2.5 h-3.5 left-[7.16px] top-[4.50px] absolute bg-gray-300" />
                </div>
                <div className="w-6 h-6 relative overflow-hidden">
                    <div className="w-2.5 h-3.5 left-[7.16px] top-[4.50px] absolute bg-gray-300" />
                </div>
                <div className="w-6 h-6 relative overflow-hidden">
                    <div className="w-2.5 h-3.5 left-[7.16px] top-[4.50px] absolute bg-gray-300" />
                </div>
            </div>
        </div>
        <div data-property="progressing" data-type="number" className="flex-1 px-6 py-4 border-b-4 border-gray-300 flex justify-start items-center gap-6">
            <div data-property="progressing" className="w-8 h-8 inline-flex flex-col justify-center items-center">
                <div className="self-stretch flex-1 bg-gray-300 rounded-[30px] outline outline-4 outline-gray-200 flex flex-col justify-center items-center">
                    <div className="text-center justify-start text-gray-50 text-xl font-bold font-['Roboto'] leading-7">3</div>
                </div>
            </div>
            <div className="justify-start text-gray-900 text-xl font-bold font-['Plus_Jakarta_Sans'] leading-8">PHẢN HỒI </div>
        </div>
    </div>
    <div className="self-stretch flex flex-col justify-start items-start gap-6">
        <div className="self-stretch flex flex-col justify-start items-start gap-6">
            <div className="self-stretch px-3 pt-3 flex flex-col justify-start items-start gap-2">
                <div className="self-stretch inline-flex justify-start items-center gap-6">
                    <div className="flex-1 flex justify-start items-center gap-6">
                        <div className="justify-center text-gray-900 text-xl font-bold font-['Plus_Jakarta_Sans'] leading-8">Trạng thái:</div>
                    </div>
                </div>
                <div className="self-stretch h-0 outline outline-1 outline-offset-[-0.50px] outline-gray-300" />
            </div>
            <div data-property-1="Withdrawn" className="w-[1175px] bg-white rounded-lg shadow-[0px_1px_30px_0px_rgba(0,0,0,0.03)] outline outline-1 outline-offset-[-1px] outline-indigo-500 flex flex-col justify-start items-start overflow-hidden">
                <div className="self-stretch px-4 py-3 flex flex-col justify-end items-end gap-4">
                    <div className="self-stretch flex flex-col justify-start items-start gap-2">
                        <div className="justify-start text-indigo-500 text-4xl font-bold font-['Plus_Jakarta_Sans'] leading-[54px]">Rút bài, cập nhật bài viết</div>
                        <div className="inline-flex justify-start items-start gap-2">
                            <div className="justify-start text-gray-900 text-base font-normal font-['Plus_Jakarta_Sans'] leading-6">Mã số bài báo</div>
                            <div className="justify-start text-gray-900 text-base font-bold font-['Plus_Jakarta_Sans'] leading-6">DF15263412</div>
                        </div>
                        <div className="self-stretch inline-flex justify-center items-center gap-2">
                            <div className="justify-start text-gray-900 text-base font-normal font-['Plus_Jakarta_Sans'] leading-6">Tình trạng cập nhật :</div>
                            <div className="flex-1 justify-start text-gray-900 text-base font-bold font-['Plus_Jakarta_Sans'] leading-6">Đã tạo trạng thái bài đã đăng ký</div>
                            <div className="px-3 py-1 rounded outline outline-1 outline-offset-[-1px] outline-gray-300 flex justify-start items-center gap-3">
                                <div className="justify-start text-gray-900 text-xs font-bold font-['Plus_Jakarta_Sans'] leading-4">0 trên 5 lần theo dõi thông qua</div>
                            </div>
                        </div>
                    </div>
                    <div className="self-stretch h-12 flex flex-col justify-start items-start gap-2.5">
                        <div data-theme="Light" data-value="10" className="self-stretch h-3.5 bg-gray-50 rounded-[999px] outline outline-1 outline-offset-[-1px] outline-gray-300 flex flex-col justify-start items-start gap-2.5">
                            <div className="self-stretch inline-flex justify-start items-start">
                                <div className="flex-1 h-3.5 bg-black/0 rounded-tl-3xl rounded-bl-3xl" />
                                <div className="flex-1 h-3.5 bg-black/0 rounded-tl-3xl rounded-bl-3xl" />
                                <div className="flex-1 h-3.5 bg-black/0 rounded-tl-3xl rounded-bl-3xl" />
                                <div className="flex-1 h-3.5 bg-black/0 rounded-tl-3xl rounded-bl-3xl" />
                                <div className="flex-1 h-3.5 bg-black/0 rounded-3xl" />
                            </div>
                        </div>
                        <div className="self-stretch inline-flex justify-start items-start gap-6">
                            <div className="flex-1 flex justify-start items-center gap-2">
                                <div data-size="2xl" className="flex justify-start items-start gap-2.5">
                                    <div className="w-5 h-5 relative overflow-hidden">
                                        <div className="w-5 h-5 left-[0.34px] top-[0.34px] absolute bg-gray-900" />
                                    </div>
                                </div>
                                <div className="justify-start text-gray-900 text-base font-normal font-['Plus_Jakarta_Sans'] leading-6">Đã đăng tải bài viết</div>
                            </div>
                            <div className="flex-1 flex justify-start items-center gap-2">
                                <div data-size="2xl" className="flex justify-start items-start gap-2.5">
                                    <div className="w-5 h-5 relative overflow-hidden">
                                        <div className="w-5 h-5 left-[0.34px] top-[0.34px] absolute bg-gray-900" />
                                    </div>
                                </div>
                                <div className="justify-start text-gray-900 text-base font-normal font-['Plus_Jakarta_Sans'] leading-6">Thông qua lần 1</div>
                            </div>
                            <div className="flex-1 flex justify-start items-center gap-2">
                                <div data-size="2xl" className="flex justify-start items-start gap-2.5">
                                    <div className="w-5 h-5 relative overflow-hidden">
                                        <div className="w-5 h-5 left-[0.34px] top-[0.34px] absolute bg-gray-900" />
                                    </div>
                                </div>
                                <div className="justify-start text-gray-900 text-base font-normal font-['Plus_Jakarta_Sans'] leading-6">Thông qua lần 2</div>
                            </div>
                            <div className="flex-1 flex justify-start items-center gap-2">
                                <div data-size="2xl" className="flex justify-start items-start gap-2.5">
                                    <div className="w-5 h-5 relative overflow-hidden">
                                        <div className="w-5 h-5 left-[0.34px] top-[0.34px] absolute bg-gray-900" />
                                    </div>
                                </div>
                                <div className="justify-start text-gray-900 text-base font-normal font-['Plus_Jakarta_Sans'] leading-6">Thông qua lần 3</div>
                            </div>
                        </div>
                    </div>
                    <div className="self-stretch inline-flex justify-start items-end gap-2">
                        <div className="flex-1 inline-flex flex-col justify-start items-start gap-2">
                            <div className="inline-flex justify-start items-start gap-1">
                                <div className="justify-start text-gray-500 text-sm font-bold font-['Roboto'] leading-5">10:00 - 25/10/2025</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div className="self-stretch flex flex-col justify-start items-start gap-6">
            <div className="self-stretch px-3 pt-3 bg-blue-50 flex flex-col justify-start items-start gap-2">
                <div className="self-stretch inline-flex justify-start items-center gap-6">
                    <div className="flex-1 flex justify-start items-center gap-6">
                        <div className="justify-center text-gray-900 text-xl font-bold font-['Plus_Jakarta_Sans'] leading-8">Lịch sử phản hồi:</div>
                    </div>
                    <div data-size="4xl" className="flex justify-start items-start gap-2.5">
                        <div className="w-8 h-8 relative overflow-hidden">
                            <div className="w-4 h-2.5 left-[8px] top-[11.34px] absolute bg-gray-500" />
                        </div>
                    </div>
                </div>
                <div className="self-stretch h-0 outline outline-1 outline-offset-[-0.50px] outline-gray-300" />
            </div>
            <div className="self-stretch bg-white rounded-[10px] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] outline outline-1 outline-offset-[-1px] outline-gray-300 flex flex-col justify-start items-start overflow-hidden">
                <div className="self-stretch border-t border-white inline-flex justify-start items-start overflow-hidden">
                    <div className="w-20 inline-flex flex-col justify-start items-start">
                        <div className="self-stretch h-11 px-6 py-4 bg-blue-50 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="flex justify-start items-center gap-1">
                                <div className="justify-start text-gray-900 text-base font-medium font-['Roboto'] leading-6">STT</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="flex-1 inline-flex flex-col justify-center items-start">
                                <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">1</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="w-40 inline-flex flex-col justify-center items-start">
                                <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">2</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="w-40 inline-flex flex-col justify-center items-start">
                                <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">3</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="w-40 inline-flex flex-col justify-center items-start">
                                <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">4</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="w-40 inline-flex flex-col justify-center items-start">
                                <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">5</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="w-40 inline-flex flex-col justify-center items-start">
                                <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">6</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="w-40 inline-flex flex-col justify-center items-start">
                                <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">7</div>
                            </div>
                        </div>
                    </div>
                    <div className="w-52 inline-flex flex-col justify-start items-start">
                        <div className="self-stretch h-11 px-6 py-4 bg-blue-50 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="flex justify-start items-center gap-1">
                                <div className="justify-start text-gray-900 text-base font-medium font-['Roboto'] leading-6">
                Thời gian</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="w-40 inline-flex flex-col justify-center items-start">
                                <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">01/11/2025 – 02:20 PM</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="w-40 inline-flex flex-col justify-center items-start">
                                <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">30/04/2025 – 11:45 AM</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="w-40 inline-flex flex-col justify-center items-start">
                                <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">02/09/2025 – 07:15 AM</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="w-40 inline-flex flex-col justify-center items-start">
                                <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">19/08/2025 – 01:30 PM</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="w-40 inline-flex flex-col justify-center items-start">
                                <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">20/09/2025 – 04:40 PM</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="w-40 inline-flex flex-col justify-center items-start">
                                <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">25/12/2025 – 10:00 AM</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="w-40 inline-flex flex-col justify-center items-start">
                                <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">25/12/2025 – 10:00 AM</div>
                            </div>
                        </div>
                    </div>
                    <div className="w-44 inline-flex flex-col justify-start items-start">
                        <div className="self-stretch h-11 px-6 py-4 bg-blue-50 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="flex justify-start items-center gap-1">
                                <div className="justify-start text-gray-900 text-base font-medium font-['Roboto'] leading-6">Người thực hiện</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="w-40 inline-flex flex-col justify-center items-start">
                                <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">Hệ thống</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="w-40 inline-flex flex-col justify-center items-start">
                                <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">Người phản hồi A</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="w-40 inline-flex flex-col justify-center items-start">
                                <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">Huỳnh Thị Thanh Trúc</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="w-40 inline-flex flex-col justify-center items-start">
                                <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">Người phản hồi B</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="w-40 inline-flex flex-col justify-center items-start">
                                <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">Tạ Minh Khang</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="w-40 inline-flex flex-col justify-center items-start">
                                <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">Đỗ Thị Diễm My</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="w-40 inline-flex flex-col justify-center items-start">
                                <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">Hệ thống</div>
                            </div>
                        </div>
                    </div>
                    <div className="inline-flex flex-col justify-start items-start">
                        <div className="self-stretch h-11 px-6 py-4 bg-blue-50 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="justify-start text-gray-900 text-base font-medium font-['Roboto'] leading-6">Hành động</div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-2">
                            <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">Phân công người phản hồi</div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-2">
                            <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">Xác nhận nhận phản biện</div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-2">
                            <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">Xác nhận nhận phản biện</div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-2">
                            <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">Từ chối phản biện</div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-2">
                            <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">Yêu cầu chỉnh sửa</div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-2">
                            <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">Phê duyệt bài viết</div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-2">
                            <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">Khóa chỉnh sửa</div>
                        </div>
                    </div>
                    <div className="w-60 inline-flex flex-col justify-start items-start">
                        <div className="self-stretch h-11 px-6 py-4 bg-blue-50 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="flex justify-start items-center gap-1">
                                <div className="justify-start text-gray-900 text-base font-medium font-['Roboto'] leading-6">Lý do chỉnh sửa</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="inline-flex flex-col justify-center items-start">
                                <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">Nhắc nhở</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="w-40 inline-flex flex-col justify-center items-start">
                                <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">Nhắc nhở</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="w-40 inline-flex flex-col justify-center items-start">
                                <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">Nhắc nhở</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="w-40 inline-flex flex-col justify-center items-start">
                                <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">Nhắc nhở</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="w-40 inline-flex flex-col justify-center items-start">
                                <div className="self-stretch justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">Bổ sung kết quả thực nghiệm theo yêu cầu phản biện</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="w-40 inline-flex flex-col justify-center items-start">
                                <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">Nhắc nhở</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="w-40 inline-flex flex-col justify-center items-start">
                                <div className="self-stretch justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">Hết hạn nộp bài - bản thảo bị khóa</div>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 inline-flex flex-col justify-start items-start">
                        <div className="self-stretch h-11 px-6 py-4 bg-blue-50 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="flex justify-start items-center gap-1">
                                <div className="justify-start text-gray-900 text-base font-medium font-['Roboto'] leading-6">Phiên bản</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="flex-1 inline-flex flex-col justify-center items-start">
                                <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">v1.1</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="flex-1 inline-flex flex-col justify-center items-start">
                                <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">v1.1</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="flex-1 inline-flex flex-col justify-center items-start">
                                <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">v1.1</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="flex-1 inline-flex flex-col justify-center items-start">
                                <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">v1.1</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="flex-1 inline-flex flex-col justify-center items-start">
                                <div className="self-stretch justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">v1.2</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="flex-1 inline-flex flex-col justify-center items-start">
                                <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">v2.0</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="flex-1 inline-flex flex-col justify-center items-start">
                                <div className="self-stretch justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">v2.1</div>
                            </div>
                        </div>
                    </div>
                    <div className="inline-flex flex-col justify-start items-start">
                        <div className="self-stretch h-11 px-6 py-4 bg-blue-50 border-b border-gray-300" />
                        <div className="h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-3">
                            <div data-size="3xl" className="flex justify-start items-start gap-2.5">
                                <div className="w-6 h-6 relative overflow-hidden">
                                    <div className="w-6 h-4 left-[1.32px] top-[5.23px] absolute bg-gray-900" />
                                </div>
                            </div>
                        </div>
                        <div className="h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-3">
                            <div data-size="3xl" className="flex justify-start items-start gap-2.5">
                                <div className="w-6 h-6 relative overflow-hidden">
                                    <div className="w-6 h-4 left-[1.32px] top-[5.23px] absolute bg-gray-900" />
                                </div>
                            </div>
                        </div>
                        <div className="h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-3">
                            <div data-size="3xl" className="flex justify-start items-start gap-2.5">
                                <div className="w-6 h-6 relative overflow-hidden">
                                    <div className="w-6 h-4 left-[1.32px] top-[5.23px] absolute bg-gray-900" />
                                </div>
                            </div>
                        </div>
                        <div className="h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-3">
                            <div data-size="3xl" className="flex justify-start items-start gap-2.5">
                                <div className="w-6 h-6 relative overflow-hidden">
                                    <div className="w-6 h-4 left-[1.32px] top-[5.23px] absolute bg-gray-900" />
                                </div>
                            </div>
                        </div>
                        <div className="h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-3">
                            <div data-size="3xl" className="flex justify-start items-start gap-2.5">
                                <div className="w-6 h-6 relative overflow-hidden">
                                    <div className="w-6 h-4 left-[1.32px] top-[5.23px] absolute bg-gray-900" />
                                </div>
                            </div>
                        </div>
                        <div className="h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-3">
                            <div data-size="3xl" className="flex justify-start items-start gap-2.5">
                                <div className="w-6 h-6 relative overflow-hidden">
                                    <div className="w-6 h-4 left-[1.32px] top-[5.23px] absolute bg-gray-900" />
                                </div>
                            </div>
                        </div>
                        <div className="h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-3">
                            <div data-size="3xl" className="flex justify-start items-start gap-2.5">
                                <div className="w-6 h-6 relative overflow-hidden">
                                    <div className="w-6 h-4 left-[1.32px] top-[5.23px] absolute bg-gray-900" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div className="self-stretch flex flex-col justify-start items-start gap-6">
            <div className="self-stretch px-3 pt-3 bg-blue-50 flex flex-col justify-start items-start gap-2">
                <div className="self-stretch inline-flex justify-start items-center gap-6">
                    <div className="flex-1 flex justify-start items-center gap-6">
                        <div className="justify-center text-gray-900 text-xl font-bold font-['Plus_Jakarta_Sans'] leading-8">Lịch sử bản nháp:</div>
                    </div>
                    <div data-size="4xl" className="flex justify-start items-start gap-2.5">
                        <div className="w-8 h-8 relative overflow-hidden">
                            <div className="w-4 h-2.5 left-[8px] top-[11.34px] absolute bg-gray-500" />
                        </div>
                    </div>
                </div>
                <div className="self-stretch h-0 outline outline-1 outline-offset-[-0.50px] outline-gray-300" />
            </div>
            <div className="self-stretch bg-white rounded-[10px] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] outline outline-1 outline-offset-[-1px] outline-gray-300 flex flex-col justify-start items-start overflow-hidden">
                <div className="self-stretch border-t border-white inline-flex justify-start items-start overflow-hidden">
                    <div className="w-20 inline-flex flex-col justify-start items-start">
                        <div className="self-stretch h-11 px-6 py-4 bg-blue-50 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="flex justify-start items-center gap-1">
                                <div className="justify-start text-gray-900 text-base font-medium font-['Roboto'] leading-6">STT</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="flex-1 inline-flex flex-col justify-center items-start">
                                <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">1</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="w-40 inline-flex flex-col justify-center items-start">
                                <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">2</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="w-40 inline-flex flex-col justify-center items-start">
                                <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">3</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="w-40 inline-flex flex-col justify-center items-start">
                                <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">4</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="w-40 inline-flex flex-col justify-center items-start">
                                <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">5</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="w-40 inline-flex flex-col justify-center items-start">
                                <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">6</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="w-40 inline-flex flex-col justify-center items-start">
                                <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">7</div>
                            </div>
                        </div>
                    </div>
                    <div className="inline-flex flex-col justify-start items-start">
                        <div className="self-stretch h-11 px-6 py-4 bg-blue-50 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="flex justify-start items-center gap-1">
                                <div className="justify-start text-gray-900 text-base font-medium font-['Roboto'] leading-6">Phiên bản</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="flex-1 inline-flex flex-col justify-center items-start">
                                <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">v1.1</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="flex-1 inline-flex flex-col justify-center items-start">
                                <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">v1.1</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="flex-1 inline-flex flex-col justify-center items-start">
                                <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">v1.1</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="flex-1 inline-flex flex-col justify-center items-start">
                                <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">v1.1</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="flex-1 inline-flex flex-col justify-center items-start">
                                <div className="self-stretch justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">v1.2</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="flex-1 inline-flex flex-col justify-center items-start">
                                <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">v2.0</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="flex-1 inline-flex flex-col justify-center items-start">
                                <div className="self-stretch justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">v2.1</div>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 inline-flex flex-col justify-start items-start">
                        <div className="self-stretch h-11 px-6 py-4 bg-blue-50 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="flex justify-start items-center gap-1">
                                <div className="justify-start text-gray-900 text-base font-medium font-['Roboto'] leading-6">Thời gian lưu</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="w-40 inline-flex flex-col justify-center items-start">
                                <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">01/11/2025 – 02:20 PM</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="w-40 inline-flex flex-col justify-center items-start">
                                <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">30/04/2025 – 11:45 AM</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="w-40 inline-flex flex-col justify-center items-start">
                                <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">02/09/2025 – 07:15 AM</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="w-40 inline-flex flex-col justify-center items-start">
                                <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">19/08/2025 – 01:30 PM</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="w-40 inline-flex flex-col justify-center items-start">
                                <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">20/09/2025 – 04:40 PM</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="w-40 inline-flex flex-col justify-center items-start">
                                <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">25/12/2025 – 10:00 AM</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="w-40 inline-flex flex-col justify-center items-start">
                                <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">25/12/2025 – 10:00 AM</div>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 inline-flex flex-col justify-start items-start">
                        <div className="self-stretch h-11 px-6 py-4 bg-blue-50 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="justify-start text-gray-900 text-base font-medium font-['Roboto'] leading-6">Dung lượng</div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-2">
                            <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">2.4 MB</div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-2">
                            <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">2.4 MB</div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-2">
                            <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">2.4 MB</div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-2">
                            <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">2.4 MB</div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-2">
                            <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">2.4 MB</div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-2">
                            <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">2.4 MB</div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-2">
                            <div className="justify-start text-gray-900 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">2.4 MB</div>
                        </div>
                    </div>
                    <div className="flex-1 inline-flex flex-col justify-start items-start">
                        <div className="self-stretch h-11 px-6 py-4 bg-blue-50 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="flex justify-start items-center gap-1">
                                <div className="justify-start text-gray-900 text-base font-medium font-['Roboto'] leading-6">Thao tác</div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="flex-1 inline-flex flex-col justify-center items-start">
                                <div className="justify-start"><span className="text-indigo-500 text-sm font-normal font-['Roboto'] underline leading-5 line-clamp-2">[Tải xuống]</span><span className="text-indigo-500 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">  [</span><span className="text-indigo-500 text-sm font-normal font-['Roboto'] underline leading-5 line-clamp-2">Khôi phục</span><span className="text-indigo-500 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">]  [</span><span className="text-indigo-500 text-sm font-normal font-['Roboto'] underline leading-5 line-clamp-2">Xoá</span><span className="text-indigo-500 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">]</span></div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="flex-1 inline-flex flex-col justify-center items-start">
                                <div className="justify-start"><span className="text-indigo-500 text-sm font-normal font-['Roboto'] underline leading-5 line-clamp-2">[Tải xuống]</span><span className="text-indigo-500 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">  [</span><span className="text-indigo-500 text-sm font-normal font-['Roboto'] underline leading-5 line-clamp-2">Khôi phục</span><span className="text-indigo-500 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">]  [</span><span className="text-indigo-500 text-sm font-normal font-['Roboto'] underline leading-5 line-clamp-2">Xoá</span><span className="text-indigo-500 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">]</span></div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="flex-1 inline-flex flex-col justify-center items-start">
                                <div className="justify-start"><span className="text-indigo-500 text-sm font-normal font-['Roboto'] underline leading-5 line-clamp-2">[Tải xuống]</span><span className="text-indigo-500 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">  [</span><span className="text-indigo-500 text-sm font-normal font-['Roboto'] underline leading-5 line-clamp-2">Khôi phục</span><span className="text-indigo-500 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">]  [</span><span className="text-indigo-500 text-sm font-normal font-['Roboto'] underline leading-5 line-clamp-2">Xoá</span><span className="text-indigo-500 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">]</span></div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="flex-1 inline-flex flex-col justify-center items-start">
                                <div className="justify-start"><span className="text-indigo-500 text-sm font-normal font-['Roboto'] underline leading-5 line-clamp-2">[Tải xuống]</span><span className="text-indigo-500 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">  [</span><span className="text-indigo-500 text-sm font-normal font-['Roboto'] underline leading-5 line-clamp-2">Khôi phục</span><span className="text-indigo-500 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">]  [</span><span className="text-indigo-500 text-sm font-normal font-['Roboto'] underline leading-5 line-clamp-2">Xoá</span><span className="text-indigo-500 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">]</span></div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="flex-1 inline-flex flex-col justify-center items-start">
                                <div className="justify-start"><span className="text-indigo-500 text-sm font-normal font-['Roboto'] underline leading-5 line-clamp-2">[Tải xuống]</span><span className="text-indigo-500 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">  [</span><span className="text-indigo-500 text-sm font-normal font-['Roboto'] underline leading-5 line-clamp-2">Khôi phục</span><span className="text-indigo-500 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">]  [</span><span className="text-indigo-500 text-sm font-normal font-['Roboto'] underline leading-5 line-clamp-2">Xoá</span><span className="text-indigo-500 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">]</span></div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="flex-1 inline-flex flex-col justify-center items-start">
                                <div className="justify-start"><span className="text-indigo-500 text-sm font-normal font-['Roboto'] underline leading-5 line-clamp-2">[Tải xuống]</span><span className="text-indigo-500 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">  [</span><span className="text-indigo-500 text-sm font-normal font-['Roboto'] underline leading-5 line-clamp-2">Khôi phục</span><span className="text-indigo-500 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">]  [</span><span className="text-indigo-500 text-sm font-normal font-['Roboto'] underline leading-5 line-clamp-2">Xoá</span><span className="text-indigo-500 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">]</span></div>
                            </div>
                        </div>
                        <div className="self-stretch h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-4">
                            <div className="flex-1 inline-flex flex-col justify-center items-start">
                                <div className="justify-start"><span className="text-indigo-500 text-sm font-normal font-['Roboto'] underline leading-5 line-clamp-2">[Tải xuống]</span><span className="text-indigo-500 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">  [</span><span className="text-indigo-500 text-sm font-normal font-['Roboto'] underline leading-5 line-clamp-2">Khôi phục</span><span className="text-indigo-500 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">]  [</span><span className="text-indigo-500 text-sm font-normal font-['Roboto'] underline leading-5 line-clamp-2">Xoá</span><span className="text-indigo-500 text-sm font-normal font-['Roboto'] leading-5 line-clamp-2">]</span></div>
                            </div>
                        </div>
                    </div>
                    <div className="inline-flex flex-col justify-start items-start">
                        <div className="self-stretch h-11 px-6 py-4 bg-blue-50 border-b border-gray-300" />
                        <div className="h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-3">
                            <div data-size="3xl" className="flex justify-start items-start gap-2.5">
                                <div className="w-6 h-6 relative overflow-hidden">
                                    <div className="w-6 h-4 left-[1.32px] top-[5.23px] absolute bg-gray-900" />
                                </div>
                            </div>
                        </div>
                        <div className="h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-3">
                            <div data-size="3xl" className="flex justify-start items-start gap-2.5">
                                <div className="w-6 h-6 relative overflow-hidden">
                                    <div className="w-6 h-4 left-[1.32px] top-[5.23px] absolute bg-gray-900" />
                                </div>
                            </div>
                        </div>
                        <div className="h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-3">
                            <div data-size="3xl" className="flex justify-start items-start gap-2.5">
                                <div className="w-6 h-6 relative overflow-hidden">
                                    <div className="w-6 h-4 left-[1.32px] top-[5.23px] absolute bg-gray-900" />
                                </div>
                            </div>
                        </div>
                        <div className="h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-3">
                            <div data-size="3xl" className="flex justify-start items-start gap-2.5">
                                <div className="w-6 h-6 relative overflow-hidden">
                                    <div className="w-6 h-4 left-[1.32px] top-[5.23px] absolute bg-gray-900" />
                                </div>
                            </div>
                        </div>
                        <div className="h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-3">
                            <div data-size="3xl" className="flex justify-start items-start gap-2.5">
                                <div className="w-6 h-6 relative overflow-hidden">
                                    <div className="w-6 h-4 left-[1.32px] top-[5.23px] absolute bg-gray-900" />
                                </div>
                            </div>
                        </div>
                        <div className="h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-3">
                            <div data-size="3xl" className="flex justify-start items-start gap-2.5">
                                <div className="w-6 h-6 relative overflow-hidden">
                                    <div className="w-6 h-4 left-[1.32px] top-[5.23px] absolute bg-gray-900" />
                                </div>
                            </div>
                        </div>
                        <div className="h-16 px-6 py-3 border-b border-gray-300 inline-flex justify-start items-center gap-3">
                            <div data-size="3xl" className="flex justify-start items-start gap-2.5">
                                <div className="w-6 h-6 relative overflow-hidden">
                                    <div className="w-6 h-4 left-[1.32px] top-[5.23px] absolute bg-gray-900" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
        </div>
    )
}